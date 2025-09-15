'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// UI
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Icons
import {
  Settings, Users, Stethoscope, Calendar, TrendingUp, Clock, CheckCircle,
  CreditCard, Plus, Search, Eye, Edit, Trash2
} from 'lucide-react';

// API
import { api } from '@/lib/api';

// ===== Tipos
type Patient = {
  id: number | string;
  nombre: string;
  correo?: string;
  telefono?: string;
  ultimaVisita?: string | null;
  estado: 'active' | 'inactive';
};

type Doctor = {
  id: number | string;
  nombre: string;
  especialidad?: string;
  correo?: string;
  telefono?: string;
  horario?: string;
  estado: 'active' | 'inactive' | 'vacation';
};

type Appointment = {
  id: number | string;
  // Para mostrar nombres aunque el backend devuelva IDs:
  paciente?: string;
  doctor?: string;
  patient_id?: number | string;
  doctor_id?: number | string;
  fecha: string;   // YYYY-MM-DD
  hora?: string;   // HH:mm
  tipo?: string;
  estado: 'confirmed' | 'pending' | 'completed' | 'cancelled';
};

type Stats = {
  totalPacientes: number;
  totalMedicos: number;
  citasHoy: number;
  ingresosMensuales: number;
  citasPendientes: number;
  citasCompletadas: number;
};

// ===== Utils
async function callSafe<T>(fn: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  try { if (typeof fn === 'function') return await fn(); } catch (e) { console.error(e); }
  return fallback;
}

function StatusBadge({
  estado,
  type = 'patient'
}: { estado: string; type?: 'patient' | 'doctor' | 'appointment' }) {
  const variants = {
    patient: { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800' },
    doctor: { active: 'bg-green-100 text-green-800', vacation: 'bg-yellow-100 text-yellow-800', inactive: 'bg-gray-100 text-gray-800' },
    appointment: {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
  } as const;

  const labels = {
    patient: { active: 'Activo', inactive: 'Inactivo' },
    doctor: { active: 'Activo', vacation: 'Vacaciones', inactive: 'Inactivo' },
    appointment: { confirmed: 'Confirmada', pending: 'Pendiente', completed: 'Completada', cancelled: 'Cancelada' }
  } as const;

  const cls = (variants as any)[type]?.[estado] ?? 'bg-gray-100 text-gray-800';
  const text = (labels as any)[type]?.[estado] ?? estado;
  return <Badge className={cls}>{text}</Badge>;
}

export default function AdminDashboard() {
  const router = useRouter();

  // ===== Estado global
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPacientes: 0, totalMedicos: 0, citasHoy: 0, ingresosMensuales: 0, citasPendientes: 0, citasCompletadas: 0
  });

  // ===== Filtros Pacientes
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // ===== Pacientes: crear/editar
  const [openCreatePatient, setOpenCreatePatient] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [patientForm, setPatientForm] = useState<{ nombre: string; correo: string; telefono: string; estado: 'active' | 'inactive' }>({
    nombre: '', correo: '', telefono: '', estado: 'active'
  });

  const [openEditPatient, setOpenEditPatient] = useState(false);
  const [editingPatient, setEditingPatient] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState<Patient | null>(null);

  // ===== Doctores: crear/editar
  const [openCreateDoctor, setOpenCreateDoctor] = useState(false);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [doctorForm, setDoctorForm] = useState<{ nombre: string; especialidad: string; correo?: string; telefono?: string; estado: 'active' | 'inactive' | 'vacation' }>({
    nombre: '', especialidad: '', correo: '', telefono: '', estado: 'active'
  });

  const [openEditDoctor, setOpenEditDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(false);
  const [editDoctorForm, setEditDoctorForm] = useState<Doctor | null>(null);

  // ===== Citas: crear/editar
  const [openCreateAppt, setOpenCreateAppt] = useState(false);
  const [creatingAppt, setCreatingAppt] = useState(false);
  const [apptForm, setApptForm] = useState<{
    patient_id: number | string | '';
    doctor_id: number | string | '';
    fecha: string;
    hora: string;
    tipo: string;
    estado: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  }>({
    patient_id: '', doctor_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '09:00',
    tipo: 'Consulta',
    estado: 'pending'
  });

  const [openEditAppt, setOpenEditAppt] = useState(false);
  const [editingAppt, setEditingAppt] = useState(false);
  const [editApptForm, setEditApptForm] = useState<Appointment | null>(null);

  // ===== Carga inicial
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [pats, docs, apps] = await Promise.all([
          callSafe<Patient[]>((api as any)?.patients?.list, []),
          callSafe<Doctor[]>((api as any)?.doctors?.list, []),
          callSafe<Appointment[]>((api as any)?.appointments?.list, [])
        ]);
        const today = new Date().toISOString().slice(0, 10);
        const s: Stats = {
          totalPacientes: pats.length,
          totalMedicos: docs.length,
          citasHoy: apps.filter(a => a.fecha === today).length,
          ingresosMensuales: 0,
          citasPendientes: apps.filter(a => a.estado === 'pending').length,
          citasCompletadas: apps.filter(a => a.estado === 'completed').length,
        };
        if (mounted) {
          setPatients(pats);
          setDoctors(docs);
          setAppointments(apps);
          setStats(s);
          setErr(null);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setErr('No se pudieron cargar los datos.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ===== Helpers nombres en Citas
  const getPatientName = (id?: number | string) =>
    id ? patients.find(p => String(p.id) === String(id))?.nombre : undefined;
  const getDoctorName = (id?: number | string) =>
    id ? doctors.find(d => String(d.id) === String(id))?.nombre : undefined;
  const displayPatient = (c: Appointment) => c.paciente || getPatientName(c.patient_id) || '—';
  const displayDoctor  = (c: Appointment) => c.doctor  || getDoctorName(c.doctor_id)  || '—';

  // ===== Sesión
  async function handleLogout() {
    try {
      if ((api as any)?.auth?.logout) await (api as any).auth.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
    } finally {
      router.replace('/');
    }
  }

  // ===== Pacientes (CRUD)
  async function handleCreatePatient() {
    if (!patientForm.nombre.trim()) return alert('El nombre del paciente es obligatorio.');
    setCreatingPatient(true);
    try {
      let created: Patient;
      if ((api as any)?.patients?.create) {
        created = await (api as any).patients.create(patientForm);
      } else {
        created = { id: Date.now(), ...patientForm };
      }
      setPatients(prev => [created, ...prev]);
      setOpenCreatePatient(false);
      setPatientForm({ nombre: '', correo: '', telefono: '', estado: 'active' });
    } catch (e) {
      console.error(e);
      alert('No se pudo crear el paciente.');
    } finally {
      setCreatingPatient(false);
    }
  }

  function startEditPatient(p: Patient) {
    setEditPatientForm(p);
    setOpenEditPatient(true);
  }

  async function handleUpdatePatient() {
    if (!editPatientForm) return;
    if (!editPatientForm.nombre?.trim()) return alert('El nombre del paciente es obligatorio.');
    setEditingPatient(true);
    try {
      let updated: Patient = editPatientForm;
      if ((api as any)?.patients?.update) {
        updated = await (api as any).patients.update(editPatientForm.id, editPatientForm);
      }
      setPatients(prev => prev.map(p => (String(p.id) === String(updated.id) ? updated : p)));
      setOpenEditPatient(false);
      setEditPatientForm(null);
    } catch (e) {
      console.error(e);
      alert('No se pudo actualizar el paciente.');
    } finally {
      setEditingPatient(false);
    }
  }

  async function handleDeletePatient(id: number | string) {
    if (!confirm('¿Eliminar este paciente?')) return;
    try {
      if ((api as any)?.patients?.remove) await (api as any).patients.remove(id);
      setPatients(prev => prev.filter(p => String(p.id) !== String(id)));
    } catch (e) {
      console.error(e);
      alert('No se pudo eliminar.');
    }
  }

  // ===== Doctores (CRUD)
  async function handleCreateDoctor() {
    if (!doctorForm.nombre.trim()) return alert('El nombre del médico es obligatorio.');
    if (!doctorForm.especialidad.trim()) return alert('La especialidad es obligatoria.');
    setCreatingDoctor(true);
    try {
      let created: Doctor;
      if ((api as any)?.doctors?.create) {
        created = await (api as any).doctors.create(doctorForm);
      } else {
        created = { id: Date.now(), ...doctorForm };
      }
      setDoctors(prev => [created, ...prev]);
      setOpenCreateDoctor(false);
      setDoctorForm({ nombre: '', especialidad: '', correo: '', telefono: '', estado: 'active' });
    } catch (e) {
      console.error(e);
      alert('No se pudo crear el médico.');
    } finally {
      setCreatingDoctor(false);
    }
  }

  function startEditDoctor(d: Doctor) {
    setEditDoctorForm(d);
    setOpenEditDoctor(true);
  }

  async function handleUpdateDoctor() {
    if (!editDoctorForm) return;
    if (!editDoctorForm.nombre?.trim()) return alert('El nombre del médico es obligatorio.');
    if (!editDoctorForm.especialidad?.trim()) return alert('La especialidad es obligatoria.');
    setEditingDoctor(true);
    try {
      let updated: Doctor = editDoctorForm;
      if ((api as any)?.doctors?.update) {
        updated = await (api as any).doctors.update(editDoctorForm.id, editDoctorForm);
      }
      setDoctors(prev => prev.map(d => (String(d.id) === String(updated.id) ? updated : d)));
      setOpenEditDoctor(false);
      setEditDoctorForm(null);
    } catch (e) {
      console.error(e);
      alert('No se pudo actualizar el médico.');
    } finally {
      setEditingDoctor(false);
    }
  }

  async function handleDeleteDoctor(id: number | string) {
    if (!confirm('¿Eliminar este médico?')) return;
    try {
      if ((api as any)?.doctors?.remove) await (api as any).doctors.remove(id);
      setDoctors(prev => prev.filter(d => String(d.id) !== String(id)));
    } catch (e) {
      console.error(e);
      alert('No se pudo eliminar.');
    }
  }

  // ===== Citas (CRUD)
  async function handleCreateAppt() {
    if (!apptForm.patient_id || !apptForm.doctor_id) return alert('Selecciona paciente y médico.');
    if (!apptForm.fecha) return alert('La fecha es obligatoria.');

    setCreatingAppt(true);
    try {
      const payload: any = {
        patient_id: apptForm.patient_id,
        doctor_id: apptForm.doctor_id,
        fecha: apptForm.fecha,
        hora: apptForm.hora,
        tipo: apptForm.tipo,
        estado: apptForm.estado,
      };
      let created: Appointment;
      if ((api as any)?.appointments?.create) {
        created = await (api as any).appointments.create(payload);
      } else {
        created = { id: Date.now(), ...payload };
      }
      const withNames: Appointment = {
        ...created,
        paciente: displayPatient(created),
        doctor: displayDoctor(created),
      };
      setAppointments(prev => [withNames, ...prev]);
      setOpenCreateAppt(false);
      setApptForm({
        patient_id: '', doctor_id: '',
        fecha: new Date().toISOString().slice(0, 10),
        hora: '09:00',
        tipo: 'Consulta',
        estado: 'pending'
      });
    } catch (e) {
      console.error(e);
      alert('No se pudo crear la cita.');
    } finally {
      setCreatingAppt(false);
    }
  }

  function startEditAppt(c: Appointment) {
    setEditApptForm(c);
    setOpenEditAppt(true);
  }

  async function handleUpdateAppt() {
    if (!editApptForm) return;
    setEditingAppt(true);
    try {
      const updatePayload: any = {
        ...editApptForm,
        patient_id: editApptForm.patient_id,
        doctor_id: editApptForm.doctor_id,
      };
      let updated: Appointment = updatePayload;
      if ((api as any)?.appointments?.update) {
        updated = await (api as any).appointments.update(editApptForm.id, updatePayload);
      }
      const withNames: Appointment = {
        ...updated,
        paciente: displayPatient(updated),
        doctor: displayDoctor(updated),
      };
      setAppointments(prev => prev.map(a => (String(a.id) === String(withNames.id) ? withNames : a)));
      setOpenEditAppt(false);
      setEditApptForm(null);
    } catch (e) {
      console.error(e);
      alert('No se pudo actualizar la cita.');
    } finally {
      setEditingAppt(false);
    }
  }

  async function handleDeleteAppt(id: number | string) {
    if (!confirm('¿Eliminar esta cita?')) return;
    try {
      if ((api as any)?.appointments?.remove) await (api as any).appointments.remove(id);
      setAppointments(prev => prev.filter(a => String(a.id) !== String(id)));
    } catch (e) {
      console.error(e);
      alert('No se pudo eliminar la cita.');
    }
  }

  // ===== Navegación
  function goBilling() { router.push('/cashier'); }

  // ===== Filtrado Pacientes
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchText =
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.correo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.telefono?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' ? true : p.estado === statusFilter;
      return matchText && matchStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  // ===== UI
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-heading text-gray-900">Panel Administrativo</h1>
                <p className="text-sm text-gray-600">Gestión integral de la clínica</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>Cerrar Sesión</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="patients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="doctors">Médicos</TabsTrigger>
            <TabsTrigger value="appointments">Citas</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Resumen General</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card><CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPacientes}</p>
                    <p className="text-sm text-gray-600">Total Pacientes</p>
                  </div>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalMedicos}</p>
                    <p className="text-sm text-gray-600">Médicos</p>
                  </div>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.citasHoy}</p>
                    <p className="text-sm text-gray-600">Citas Hoy</p>
                  </div>
                </div>
              </CardContent></Card>

              <Card><CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">Q{stats.ingresosMensuales.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Ingresos Mensuales</p>
                  </div>
                </div>
              </CardContent></Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Citas de Hoy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pendientes</span>
                      <Badge className="bg-yellow-100 text-yellow-800">{stats.citasPendientes}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Completadas</span>
                      <Badge className="bg-green-100 text-green-800">{stats.citasCompletadas}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setOpenCreatePatient(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Registrar Nuevo Paciente
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setOpenCreateAppt(true)}>
                    <Calendar className="w-4 h-4 mr-2" /> Programar Cita
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={goBilling}>
                    <CreditCard className="w-4 h-4 mr-2" /> Procesar Facturación
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pacientes */}
          <TabsContent value="patients" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Pacientes</h2>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setOpenCreatePatient(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Paciente
              </Button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Buscar pacientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900">Paciente</th>
                        <th className="text-left p-4 font-medium text-gray-900">Contacto</th>
                        <th className="text-left p-4 font-medium text-gray-900">Última Visita</th>
                        <th className="text-left p-4 font-medium text-gray-900">Estado</th>
                        <th className="text-left p-4 font-medium text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((paciente) => (
                        <tr key={paciente.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-gray-900">{paciente.nombre}</p>
                              <p className="text-sm text-gray-600">ID: {paciente.id}</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm">
                            <p className="text-gray-900">{paciente.correo || '-'}</p>
                            <p className="text-gray-600">{paciente.telefono || '-'}</p>
                          </td>
                          <td className="p-4 text-sm text-gray-900">{paciente.ultimaVisita ?? '-'}</td>
                          <td className="p-4"><StatusBadge estado={paciente.estado} type="patient" /></td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => router.push(`/admin/patients/${paciente.id}`)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => startEditPatient(paciente)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeletePatient(paciente.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPatients.length === 0 && !loading && (
                        <tr><td className="p-4 text-sm text-gray-600" colSpan={5}>No hay pacientes.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Médicos */}
          <TabsContent value="doctors" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Médicos</h2>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setOpenCreateDoctor(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Médico
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((medico) => (
                <Card key={medico.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{medico.nombre}</h3>
                          <p className="text-gray-600">{medico.especialidad}</p>
                        </div>
                        <StatusBadge estado={medico.estado} type="doctor" />
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-600">{medico.correo || '-'}</p>
                        <p className="text-gray-600">{medico.telefono || '-'}</p>
                        <p className="text-gray-600">Horario: {medico.horario || '-'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => startEditDoctor(medico)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDeleteDoctor(medico.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {doctors.length === 0 && !loading && <div className="text-sm text-gray-600">No hay médicos.</div>}
            </div>
          </TabsContent>

          {/* Citas */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Citas</h2>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setOpenCreateAppt(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nueva Cita
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900">Paciente</th>
                        <th className="text-left p-4 font-medium text-gray-900">Médico</th>
                        <th className="text-left p-4 font-medium text-gray-900">Fecha y Hora</th>
                        <th className="text-left p-4 font-medium text-gray-900">Tipo</th>
                        <th className="text-left p-4 font-medium text-gray-900">Estado</th>
                        <th className="text-left p-4 font-medium text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((cita) => (
                        <tr key={cita.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900">{displayPatient(cita)}</td>
                          <td className="p-4 text-gray-900">{displayDoctor(cita)}</td>
                          <td className="p-4 text-gray-900">{cita.fecha}{cita.hora ? ` - ${cita.hora}` : ''}</td>
                          <td className="p-4 text-gray-900">{cita.tipo || '-'}</td>
                          <td className="p-4"><StatusBadge estado={cita.estado} type="appointment" /></td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => startEditAppt(cita)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteAppt(cita.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {appointments.length === 0 && !loading && (
                        <tr><td className="p-4 text-sm text-gray-600" colSpan={6}>No hay citas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuración */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Configuración General</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinic-name">Nombre de la Clínica</Label>
                    <Input id="clinic-name" defaultValue="Clínica Médica San Rafael" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-address">Dirección</Label>
                    <Input id="clinic-address" defaultValue="12 Calle 3-45, Zona 10, Guatemala, Guatemala" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-phone">Teléfono</Label>
                    <Input id="clinic-phone" defaultValue="+502 2345-6789" />
                  </div>
                  <Button className="w-full">Guardar Cambios</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Horarios de Atención</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Lunes a Viernes</Label>
                    <div className="flex gap-2">
                      <Input defaultValue="08:00" /><span className="flex items-center">-</span><Input defaultValue="18:00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Sábados</Label>
                    <div className="flex gap-2">
                      <Input defaultValue="09:00" /><span className="flex items-center">-</span><Input defaultValue="14:00" />
                    </div>
                  </div>
                  <Button className="w-full">Actualizar Horarios</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== Modales ===== */}

      {/* Crear Paciente */}
      <Dialog open={openCreatePatient} onOpenChange={setOpenCreatePatient}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Paciente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={patientForm.nombre} onChange={e => setPatientForm({ ...patientForm, nombre: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Correo</Label>
              <Input type="email" value={patientForm.correo} onChange={e => setPatientForm({ ...patientForm, correo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={patientForm.telefono} onChange={e => setPatientForm({ ...patientForm, telefono: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={patientForm.estado} onValueChange={(v) => setPatientForm({ ...patientForm, estado: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreatePatient(false)}>Cancelar</Button>
            <Button onClick={handleCreatePatient} disabled={creatingPatient}>
              {creatingPatient ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar Paciente */}
      <Dialog open={openEditPatient} onOpenChange={setOpenEditPatient}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Paciente</DialogTitle></DialogHeader>
          {editPatientForm && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={editPatientForm.nombre} onChange={e => setEditPatientForm({ ...editPatientForm, nombre: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Correo</Label>
                <Input value={editPatientForm.correo || ''} onChange={e => setEditPatientForm({ ...editPatientForm, correo: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={editPatientForm.telefono || ''} onChange={e => setEditPatientForm({ ...editPatientForm, telefono: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={editPatientForm.estado} onValueChange={(v) => setEditPatientForm({ ...editPatientForm, estado: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditPatient(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePatient} disabled={editingPatient}>
              {editingPatient ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crear Médico */}
      <Dialog open={openCreateDoctor} onOpenChange={setOpenCreateDoctor}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Médico</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={doctorForm.nombre} onChange={e => setDoctorForm({ ...doctorForm, nombre: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Especialidad</Label>
              <Input value={doctorForm.especialidad} onChange={e => setDoctorForm({ ...doctorForm, especialidad: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Correo</Label>
              <Input type="email" value={doctorForm.correo} onChange={e => setDoctorForm({ ...doctorForm, correo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={doctorForm.telefono} onChange={e => setDoctorForm({ ...doctorForm, telefono: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={doctorForm.estado} onValueChange={(v) => setDoctorForm({ ...doctorForm, estado: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="vacation">Vacaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateDoctor(false)}>Cancelar</Button>
            <Button onClick={handleCreateDoctor} disabled={creatingDoctor}>
              {creatingDoctor ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar Médico */}
      <Dialog open={openEditDoctor} onOpenChange={setOpenEditDoctor}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Médico</DialogTitle></DialogHeader>
          {editDoctorForm && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={editDoctorForm.nombre} onChange={e => setEditDoctorForm({ ...editDoctorForm, nombre: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Especialidad</Label>
                <Input value={editDoctorForm.especialidad || ''} onChange={e => setEditDoctorForm({ ...editDoctorForm, especialidad: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Correo</Label>
                <Input value={editDoctorForm.correo || ''} onChange={e => setEditDoctorForm({ ...editDoctorForm, correo: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={editDoctorForm.telefono || ''} onChange={e => setEditDoctorForm({ ...editDoctorForm, telefono: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={editDoctorForm.estado} onValueChange={(v) => setEditDoctorForm({ ...editDoctorForm, estado: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="vacation">Vacaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDoctor(false)}>Cancelar</Button>
            <Button onClick={handleUpdateDoctor} disabled={editingDoctor}>
              {editingDoctor ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crear Cita */}
      <Dialog open={openCreateAppt} onOpenChange={setOpenCreateAppt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Cita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select
                value={apptForm.patient_id ? String(apptForm.patient_id) : ''}
                onValueChange={(v) => setApptForm({ ...apptForm, patient_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Médico</Label>
              <Select
                value={apptForm.doctor_id ? String(apptForm.doctor_id) : ''}
                onValueChange={(v) => setApptForm({ ...apptForm, doctor_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona médico" /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}{d.especialidad ? ` (${d.especialidad})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={apptForm.fecha} onChange={e => setApptForm({ ...apptForm, fecha: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input type="time" value={apptForm.hora} onChange={e => setApptForm({ ...apptForm, hora: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input value={apptForm.tipo} onChange={e => setApptForm({ ...apptForm, tipo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={apptForm.estado} onValueChange={(v) => setApptForm({ ...apptForm, estado: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                   <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateAppt(false)}>Cancelar</Button>
            <Button onClick={handleCreateAppt} disabled={creatingAppt}>
              {creatingAppt ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar Cita */}
      <Dialog open={openEditAppt} onOpenChange={setOpenEditAppt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Cita</DialogTitle></DialogHeader>
          {editApptForm && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Paciente</Label>
                <Select
                  value={editApptForm.patient_id ? String(editApptForm.patient_id) : ''}
                  onValueChange={(v) => setEditApptForm({ ...editApptForm, patient_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Médico</Label>
                <Select
                  value={editApptForm.doctor_id ? String(editApptForm.doctor_id) : ''}
                  onValueChange={(v) => setEditApptForm({ ...editApptForm, doctor_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona médico" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}{d.especialidad ? ` (${d.especialidad})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={editApptForm.fecha} onChange={e => setEditApptForm({ ...editApptForm, fecha: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Hora</Label>
                  <Input type="time" value={editApptForm.hora || ''} onChange={e => setEditApptForm({ ...editApptForm, hora: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Input value={editApptForm.tipo || ''} onChange={e => setEditApptForm({ ...editApptForm, tipo: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={editApptForm.estado} onValueChange={(v) => setEditApptForm({ ...editApptForm, estado: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditAppt(false)}>Cancelar</Button>
            <Button onClick={handleUpdateAppt} disabled={editingAppt}>
              {editingAppt ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
