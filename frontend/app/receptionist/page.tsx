'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// shadcn/ui
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Icons
import {
  Calendar,
  Phone,
  UserPlus,
  Clock,
  Search,
  Plus,
  Edit,
  CheckCircle,
  AlertCircle,
  Users,
} from 'lucide-react';

// ----- Tipos mínimos (ajusta a tus modelos reales)
type Appointment = {
  id: number | string;
  patient: string;
  doctor: string;
  type?: string;
  phone?: string;
  email?: string;
  status: 'confirmed' | 'pending' | 'waiting' | 'completed';
  date?: string; // YYYY-MM-DD
  time: string;  // HH:mm
};

type Patient = {
  id: number | string;
  nombre: string;
  correo?: string;
  telefono?: string;
  estado?: 'active' | 'inactive';
};

type Doctor = {
  id: number | string;
  nombre: string;
  especialidad?: string;
};

type WaitingItem = {
  id: number | string;
  patient: string;
  doctor: string;
  arrivalTime: string;
  estimatedWait: string;
};

type Stats = {
  todayAppointments: number;
  pendingConfirmations: number;
  newPatients: number;
  waitingPatients: number;
};

// ----- Helpers
async function callSafe<T>(fn: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  try {
    if (typeof fn === 'function') return await fn();
  } catch (e) {
    console.error(e);
  }
  return fallback;
}

function StatusBadge({ status }: { status: Appointment['status'] }) {
  const variants: Record<Appointment['status'], string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    waiting: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800',
  };
  const labels: Record<Appointment['status'], string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    waiting: 'Esperando',
    completed: 'Completada',
  };
  return <Badge className={variants[status]}>{labels[status]}</Badge>;
}

export default function ReceptionistDashboard() {
  const router = useRouter();

  // Datos
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [waitingList, setWaitingList] = useState<WaitingItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    todayAppointments: 0,
    pendingConfirmations: 0,
    newPatients: 0,
    waitingPatients: 0,
  });

  // UI
  const [activeTab, setActiveTab] = useState<'appointments' | 'waiting' | 'schedule' | 'patients'>('appointments');
  const [loading, setLoading] = useState(true);
  const [searchPatient, setSearchPatient] = useState('');

  // Form: crear paciente
  const [openCreatePatient, setOpenCreatePatient] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState<Pick<Patient, 'nombre' | 'correo' | 'telefono' | 'estado'>>({
    nombre: '',
    correo: '',
    telefono: '',
    estado: 'active',
  });

  // Form: programar cita
  const [scheduleForm, setScheduleForm] = useState({
    patient: '',
    phone: '',
    email: '',
    doctorId: '',
    date: '',
    time: '',
    type: 'Consulta',
  });
  const [creatingAppt, setCreatingAppt] = useState(false);

  // Carga inicial
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const [apts, pats] = await Promise.all([
        callSafe<Appointment[]>((api as any)?.appointments?.list, []),
        callSafe<Patient[]>((api as any)?.patients?.list, []),
      ]);

      // doctores por separado para tener un estado de carga claro del combo
      try {
        setDoctorsLoading(true);
        const docs = await callSafe<Doctor[]>((api as any)?.doctors?.list, []);
        if (mounted) setDoctors(docs);
      } finally {
        if (mounted) setDoctorsLoading(false);
      }

      const initialWaiting: WaitingItem[] =
        apts
          .filter((a) => a.status === 'waiting')
          .map((a) => ({
            id: `w-${a.id}`,
            patient: a.patient,
            doctor: a.doctor,
            arrivalTime: '08:00',
            estimatedWait: '10 min',
          })) ?? [];

      if (!mounted) return;

      setAppointments(apts);
      setPatients(pats);
      setWaitingList(initialWaiting);

      const todayCount =
        apts.filter((a) => (a.date ? a.date === today : true)).length;

      setStats({
        todayAppointments: todayCount,
        pendingConfirmations: apts.filter((a) => a.status === 'pending').length,
        newPatients: 0,
        waitingPatients: initialWaiting.length,
      });

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ----- Handlers

  async function handleLogout() {
    try {
      if ((api as any)?.auth?.logout) {
        await (api as any).auth.logout();
      } else {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      }
    } finally {
      try {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      } catch {}
      router.replace('/');
    }
  }

  async function handleCreatePatient() {
    if (!patientForm.nombre) return;
    setCreatingPatient(true);
    try {
      let created: Patient;
      if ((api as any)?.patients?.create) {
        created = await (api as any).patients.create({
          nombre: patientForm.nombre,
          correo: patientForm.correo,
          telefono: patientForm.telefono,
          estado: patientForm.estado,
        });
      } else {
        created = { id: Date.now(), ...patientForm };
      }
      setPatients((prev) => [created, ...prev]);
      setOpenCreatePatient(false);
      setPatientForm({ nombre: '', correo: '', telefono: '', estado: 'active' });
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingPatient(false);
    }
  }

  async function handleScheduleAppointment() {
    const { patient, phone, email, doctorId, date, time, type } = scheduleForm;
    if (!patient || !doctorId || !date || !time) return;

    setCreatingAppt(true);
    try {
      const doctorName = doctors.find((d) => String(d.id) === String(doctorId))?.nombre ?? 'Médico';
      let created: Appointment;

      if ((api as any)?.appointments?.create) {
        // payload que espera el backend (ver sección 2)
        const saved = await (api as any).appointments.create({
          patient_name: patient,
          phone,
          email,
          doctor_id: Number(doctorId),
          date,                // 'YYYY-MM-DD'
          time,                // 'HH:mm'
          type,
          status: 'pending',
        });

        // normaliza la respuesta para mostrar en la tarjeta
        created = {
          id: saved.id,
          patient: saved.patient ?? saved.patient_name ?? patient,
          doctor: saved.doctor ?? saved.doctor_name ?? doctorName,
          time: saved.time ?? time,
          date: saved.date ?? date,
          type: saved.type ?? type,
          phone: saved.phone ?? phone,
          email: saved.email ?? email,
          status: saved.status ?? 'pending',
        };
      } else {
        created = {
          id: Date.now(),
          patient,
          phone,
          email,
          doctor: doctorName,
          date,
          time,
          type,
          status: 'pending',
        };
      }

      setAppointments((prev) => [created, ...prev]);

      setStats((s) => ({
        ...s,
        todayAppointments:
          s.todayAppointments + (created.date ? (created.date === new Date().toISOString().slice(0, 10) ? 1 : 0) : 1),
        pendingConfirmations: s.pendingConfirmations + 1,
      }));

      setActiveTab('appointments');
      setScheduleForm({ patient: '', phone: '', email: '', doctorId: '', date: '', time: '', type: 'Consulta' });
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingAppt(false);
    }
  }

  async function handleConfirmAppointment(id: Appointment['id']) {
    try {
      if ((api as any)?.appointments?.update) {
        await (api as any).appointments.update(id, { status: 'confirmed' });
      }
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'confirmed' } : a)),
      );
      setStats((s) => ({
        ...s,
        pendingConfirmations: Math.max(0, s.pendingConfirmations - 1),
      }));
    } catch (e) {
      console.error(e);
    }
  }

  function handleEditAppointment(id: Appointment['id']) {
    // implementa tu página /appointments/[id]/edit si la necesitas
    // router.push(`/appointments/${id}/edit`);
    alert(`Editar cita ${id} (implementa tu ruta de edición)`);
  }

  function handleCall(phone?: string) {
    if (!phone) return;
    try {
      window.location.href = `tel:${phone}`;
    } catch {}
  }

  function handleCallNext() {
    const next = waitingList[0];
    if (!next) return;
    setWaitingList((prev) => prev.slice(1));
    setAppointments((prev) =>
      prev.map((a) =>
        a.patient === next.patient && a.doctor === next.doctor && a.status === 'waiting'
          ? { ...a, status: 'confirmed' }
          : a,
      ),
    );
    setStats((s) => ({ ...s, waitingPatients: Math.max(0, s.waitingPatients - 1) }));
  }

  // ----- Filtros
  const filteredPatients = patients.filter((p) =>
    `${p.nombre} ${p.correo ?? ''} ${p.telefono ?? ''}`.toLowerCase().includes(searchPatient.toLowerCase()),
  );

  // horas sugeridas
  const suggestedTimes = ['08:00','09:00','10:00','11:00','12:00','14:00','15:00'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-heading text-gray-900">Recepción</h1>
                <p className="text-sm text-gray-600">Gestión de citas y atención al paciente</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.todayAppointments}</p>
                  <p className="text-sm text-gray-600">Citas Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.pendingConfirmations}</p>
                  <p className="text-sm text-gray-600">Por Confirmar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.newPatients}</p>
                  <p className="text-sm text-gray-600">Pacientes Nuevos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.waitingPatients}</p>
                  <p className="text-sm text-gray-600">En Espera</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments">Citas del Día</TabsTrigger>
            <TabsTrigger value="waiting">Sala de Espera</TabsTrigger>
            <TabsTrigger value="schedule">Programar Cita</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
          </TabsList>

          {/* Citas del día */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Citas del Día</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCallNext}>
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar Siguiente
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {appointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{appointment.time}</span>
                          <StatusBadge status={appointment.status} />
                        </div>
                        <h3 className="font-semibold text-lg">{appointment.patient}</h3>
                        <p className="text-gray-600">
                          {appointment.doctor} {appointment.type ? `- ${appointment.type}` : ''}
                        </p>
                        <p className="text-sm text-gray-600">{appointment.phone ?? ''}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleCall(appointment.phone)}>
                          <Phone className="w-4 h-4 mr-2" />
                          Llamar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditAppointment(appointment.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        {appointment.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleConfirmAppointment(appointment.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirmar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {appointments.length === 0 && !loading && (
                <div className="text-sm text-gray-600">No hay citas para mostrar.</div>
              )}
            </div>
          </TabsContent>

          {/* Sala de espera */}
          <TabsContent value="waiting" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Sala de Espera</h2>
            <div className="grid gap-4">
              {waitingList.map((patient) => (
                <Card key={patient.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{patient.patient}</h3>
                        <p className="text-gray-600">
                          {patient.doctor} - Llegó a las {patient.arrivalTime}
                        </p>
                        <p className="text-sm text-orange-600">
                          Tiempo estimado de espera: {patient.estimatedWait}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('appointments')}>
                          Notificar al Médico
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleCallNext}>
                          Llamar a Consulta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {waitingList.length === 0 && !loading && (
                <div className="text-sm text-gray-600">No hay pacientes en espera.</div>
              )}
            </div>
          </TabsContent>

          {/* Programar cita */}
          <TabsContent value="schedule" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Programar Nueva Cita</h2>

            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patient-name">Nombre del Paciente</Label>
                      <Input
                        id="patient-name"
                        placeholder="Nombre completo"
                        value={scheduleForm.patient}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, patient: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patient-phone">Teléfono</Label>
                      <Input
                        id="patient-phone"
                        placeholder="+502 0000 0000"
                        value={scheduleForm.phone}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patient-email">Email</Label>
                      <Input
                        id="patient-email"
                        type="email"
                        placeholder="paciente@email.com"
                        value={scheduleForm.email}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctor-select">Médico</Label>
                      <Select
                        value={scheduleForm.doctorId}
                        onValueChange={(v) => setScheduleForm({ ...scheduleForm, doctorId: v })}
                        disabled={doctorsLoading || doctors.length === 0}
                      >
                        <SelectTrigger id="doctor-select">
                          <SelectValue placeholder={doctorsLoading ? 'Cargando...' : 'Seleccionar médico'} />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.nombre}{d.especialidad ? ` - ${d.especialidad}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!doctorsLoading && doctors.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">No hay médicos disponibles. Crea uno en el módulo de Médicos.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="appointment-date">Fecha</Label>
                      <Input
                        id="appointment-date"
                        type="date"
                        value={scheduleForm.date}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="appointment-time">Hora</Label>
                      <Select
                        value={scheduleForm.time}
                        onValueChange={(v) => setScheduleForm({ ...scheduleForm, time: v })}
                      >
                        <SelectTrigger id="appointment-time">
                          <SelectValue placeholder="Seleccionar hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {suggestedTimes.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={handleScheduleAppointment}
                    disabled={
                      creatingAppt ||
                      !scheduleForm.patient ||
                      !scheduleForm.doctorId ||
                      !scheduleForm.date ||
                      !scheduleForm.time
                    }
                  >
                    {creatingAppt ? 'Guardando...' : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Programar Cita
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pacientes */}
          <TabsContent value="patients" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Gestión de Pacientes</h2>

              {/* Modal simple sin import de Dialog para mantener liviano */}
              <div className="flex gap-2">
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setOpenCreatePatient(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrar Paciente
                </Button>
                {openCreatePatient && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                      <h3 className="text-lg font-semibold mb-4">Registrar Paciente</h3>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="p-nombre">Nombre</Label>
                          <Input
                            id="p-nombre"
                            value={patientForm.nombre}
                            onChange={(e) => setPatientForm({ ...patientForm, nombre: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="p-correo">Correo</Label>
                          <Input
                            id="p-correo"
                            value={patientForm.correo}
                            onChange={(e) => setPatientForm({ ...patientForm, correo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="p-telefono">Teléfono</Label>
                          <Input
                            id="p-telefono"
                            value={patientForm.telefono}
                            onChange={(e) => setPatientForm({ ...patientForm, telefono: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Estado</Label>
                          <Select
                            value={patientForm.estado}
                            onValueChange={(v) => setPatientForm({ ...patientForm, estado: v as 'active' | 'inactive' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="inactive">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpenCreatePatient(false)}>Cancelar</Button>
                        <Button onClick={handleCreatePatient} disabled={creatingPatient || !patientForm.nombre}>
                          {creatingPatient ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar pacientes..."
                    className="pl-10"
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Utiliza el buscador para encontrar pacientes registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-900">Paciente</th>
                          <th className="text-left p-4 font-medium text-gray-900">Contacto</th>
                          <th className="text-left p-4 font-medium text-gray-900">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPatients.map((p) => (
                          <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div className="font-medium text-gray-900">
                                {p.nombre ?? `Paciente #${p.id}`}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-700">
                              {p.correo ?? '-'} {p.telefono ? ` · ${p.telefono}` : ''}
                            </td>
                            <td className="p-4">
                              <Badge className={(p.estado ?? 'active') === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {(p.estado ?? 'active') === 'active' ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
