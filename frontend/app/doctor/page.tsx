'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  Stethoscope,
  Calendar,
  FileText,
  Activity,
  Clock,
  Eye,
  Edit,
  User,
  Clipboard,
  Pill,
  Download,
} from 'lucide-react';

// ===== Tipos mínimos (ajusta a tus modelos reales si quieres tipar más estricto)
type Patient = { id: number | string; nombre: string; edad?: number };
type Doctor = { id: number | string; nombre: string; especialidad?: string };
type Appointment = {
  id: number | string;
  doctorId: number | string;
  patientId: number | string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  tipo?: string;
  motivo?: string;
  estado: 'waiting' | 'in-progress' | 'completed';
};
type HistoryRecord = {
  id: number | string;
  paciente: string;
  fecha: string;
  diagnostico: string;
  tratamiento: string;
  notas?: string;
};
type Prescription = {
  id: number | string;
  paciente: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  fecha: string;
};

async function callSafe<T>(fn: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  try {
    if (typeof fn === 'function') return await fn();
  } catch (e) {
    console.error(e);
  }
  return fallback;
}

function StatusBadge({ estado }: { estado: Appointment['estado'] }) {
  const variants = {
    waiting: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  } as const;
  const labels = {
    waiting: 'Esperando',
    'in-progress': 'En consulta',
    completed: 'Completado',
  } as const;
  return <Badge className={variants[estado]}>{labels[estado]}</Badge>;
}

export default function DoctorDashboard() {
  const router = useRouter();

  // ===== Datos
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // ===== UI
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'prescriptions' | 'consultation' | 'reports'>(
    'today',
  );
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consulta (form)
  const [exam, setExam] = useState({ bp: '', hr: '', temp: '', weight: '' });
  const [consult, setConsult] = useState({ complaint: '', diagnosis: '', treatment: '', notes: '' });

  // Receta (modal)
  const [openRx, setOpenRx] = useState(false);
  const [rxForm, setRxForm] = useState<Pick<Prescription, 'paciente' | 'medicamento' | 'dosis' | 'frecuencia' | 'duracion'>>({
    paciente: '',
    medicamento: '',
    dosis: '',
    frecuencia: '',
    duracion: '',
  });
  const [savingRx, setSavingRx] = useState(false);

  // ===== Carga inicial
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [apts, pats, docs] = await Promise.all([
          callSafe<Appointment[]>((api as any)?.appointments?.list, [
            {
              id: 1,
              doctorId: 1,
              patientId: 10,
              patientName: 'María Elena Morales',
              date: new Date().toISOString().slice(0, 10),
              time: '09:00',
              tipo: 'Control',
              motivo: 'Chequeo general',
              estado: 'waiting',
            },
            {
              id: 2,
              doctorId: 1,
              patientId: 11,
              patientName: 'José Antonio Pérez',
              date: new Date().toISOString().slice(0, 10),
              time: '10:30',
              tipo: 'Primera vez',
              motivo: 'Dolor torácico',
              estado: 'waiting',
            },
          ]),
          callSafe<Patient[]>((api as any)?.patients?.list, [
            { id: 10, nombre: 'María Elena Morales', edad: 34 },
            { id: 11, nombre: 'José Antonio Pérez', edad: 48 },
            { id: 12, nombre: 'Ana Lucía García', edad: 29 },
          ]),
          callSafe<Doctor[]>((api as any)?.doctors?.list, [{ id: 1, nombre: 'Dra. Ana López', especialidad: 'Cardiología' }]),
        ]);

        const currentDoctorId =
          (typeof window !== 'undefined' && localStorage.getItem('doctorId')) || String(docs[0]?.id ?? '1');
        const doc = docs.find((d) => String(d.id) === String(currentDoctorId)) ?? docs[0] ?? null;

        setDoctor(doc);
        setAppointments(apts);
        setPatients(pats);

        // Historia y recetas de ejemplo
        setHistory([
          {
            id: 101,
            paciente: 'María Elena Morales',
            fecha: new Date().toISOString().slice(0, 10),
            diagnostico: 'Hipertensión arterial',
            tratamiento: 'Amlodipino 5mg/día',
            notas: 'Control en 1 mes',
          },
        ]);
        setPrescriptions([
          {
            id: 2001,
            paciente: 'María Elena Morales',
            medicamento: 'Amlodipino',
            dosis: '5 mg',
            frecuencia: '1 vez al día',
            duracion: '30 días',
            fecha: new Date().toISOString().slice(0, 10),
          },
        ]);
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar datos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ===== Derivados
  const today = new Date().toISOString().slice(0, 10);
  const todayPatients = appointments
    .filter((a) => (doctor ? String(a.doctorId) === String(doctor.id) : true))
    .filter((a) => a.date === today);

  // ===== Handlers
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

  function handleViewHistory(paciente: string) {
    setSelectedPatient(paciente);
    setActiveTab('history');
  }

  function handleStartConsultation(paciente: string) {
    setSelectedPatient(paciente);
    setActiveTab('consultation');
  }

  function handleDownloadPrescription(rx: Prescription) {
    const text = [
      `Receta #${rx.id}`,
      `Paciente: ${rx.paciente}`,
      `Medicamento: ${rx.medicamento}`,
      `Dosis: ${rx.dosis}`,
      `Frecuencia: ${rx.frecuencia}`,
      `Duración: ${rx.duracion}`,
      `Fecha: ${rx.fecha}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receta-${rx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveConsultation() {
    if (!selectedPatient) return;
    const record: HistoryRecord = {
      id: Date.now(),
      paciente: selectedPatient,
      fecha: new Date().toISOString().slice(0, 10),
      diagnostico: consult.diagnosis || '—',
      tratamiento: consult.treatment || '—',
      notas: consult.notes || '',
    };
    try {
      if ((api as any)?.consultations?.create) {
        await (api as any).consultations.create({
          patient: selectedPatient,
          exam,
          ...consult,
        });
      }
      setHistory((prev) => [record, ...prev]);
      // Marcar cita como completada
      setAppointments((prev) =>
        prev.map((a) =>
          a.patientName === selectedPatient && a.date === today ? { ...a, estado: 'completed' } : a,
        ),
      );
      setConsult({ complaint: '', diagnosis: '', treatment: '', notes: '' });
      setExam({ bp: '', hr: '', temp: '', weight: '' });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSavePrescription() {
    if (!rxForm.paciente || !rxForm.medicamento) return;
    setSavingRx(true);
    try {
      const created: Prescription =
        (api as any)?.prescriptions?.create
          ? await (api as any).prescriptions.create({ ...rxForm })
          : {
              id: Date.now(),
              paciente: rxForm.paciente,
              medicamento: rxForm.medicamento,
              dosis: rxForm.dosis,
              frecuencia: rxForm.frecuencia,
              duracion: rxForm.duracion,
              fecha: new Date().toISOString().slice(0, 10),
            };
      setPrescriptions((prev) => [created, ...prev]);
      setOpenRx(false);
      setRxForm({ paciente: '', medicamento: '', dosis: '', frecuencia: '', duracion: '' });
      setActiveTab('prescriptions');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRx(false);
    }
  }

  // ===== UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        {error && <div className="text-red-600 text-center">{error}</div>}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-heading text-gray-900">Portal Médico</h1>
                <p className="text-sm text-gray-600">
                  {doctor?.nombre ?? 'Médico'}{doctor?.especialidad ? ` - ${doctor.especialidad}` : ''}
                </p>
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
                  <p className="text-2xl font-bold font-heading text-gray-900">{todayPatients.length}</p>
                  <p className="text-sm text-gray-600">Pacientes Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{prescriptions.length}</p>
                  <p className="text-sm text-gray-600">Recetas Emitidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">
                    {history.filter((h) => h.fecha === today).length}
                  </p>
                  <p className="text-sm text-gray-600">Consultas Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">
                    {todayPatients[0]?.time ?? '—'}
                  </p>
                  <p className="text-sm text-gray-600">Próxima Cita</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today">Agenda Hoy</TabsTrigger>
            <TabsTrigger value="history">Historiales</TabsTrigger>
            <TabsTrigger value="prescriptions">Recetas</TabsTrigger>
            <TabsTrigger value="consultation">Consulta</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          {/* Agenda de Hoy */}
          <TabsContent value="today" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Agenda de Hoy</h2>

            <div className="grid gap-4">
              {todayPatients.map((p) => (
                <Card key={String(p.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{p.time}</span>
                          <StatusBadge estado={p.estado} />
                        </div>
                        <h3 className="font-semibold text-lg">{p.patientName}</h3>
                        <p className="text-gray-600">
                          {p.tipo ?? 'Consulta'} {p.motivo ? `- ${p.motivo}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewHistory(p.patientName)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Historial
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStartConsultation(p.patientName)}>
                          Iniciar Consulta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {todayPatients.length === 0 && !loading && (
                <div className="text-sm text-gray-600">No hay citas para hoy.</div>
              )}
            </div>
          </TabsContent>

          {/* Historiales */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Historiales Médicos</h2>
              <div className="relative">
                <Input
                  placeholder="Buscar paciente..."
                  className="w-64"
                  onChange={(e) => setSelectedPatient(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4">
              {history
                .filter((r) =>
                  selectedPatient ? r.paciente.toLowerCase().includes(selectedPatient.toLowerCase()) : true,
                )
                .map((registro) => (
                  <Card key={String(registro.id)}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{registro.paciente}</h3>
                            <p className="text-gray-600">{registro.fecha}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setActiveTab('consultation')}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <p>
                            <span className="font-medium">Diagnóstico:</span> {registro.diagnostico}
                          </p>
                          <p>
                            <span className="font-medium">Tratamiento:</span> {registro.tratamiento}
                          </p>
                          <p>
                            <span className="font-medium">Notas:</span> {registro.notas ?? '—'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              {history.length === 0 && (
                <div className="text-sm text-gray-600">Aún no hay historiales.</div>
              )}
            </div>
          </TabsContent>

          {/* Recetas */}
          <TabsContent value="prescriptions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Recetas Médicas</h2>

              <Dialog open={openRx} onOpenChange={setOpenRx}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Pill className="w-4 h-4 mr-2" />
                    Nueva Receta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Receta</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Paciente</Label>
                      <Select
                        value={rxForm.paciente}
                        onValueChange={(v) => setRxForm((s) => ({ ...s, paciente: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((p) => (
                            <SelectItem key={String(p.id)} value={p.nombre}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Medicamento</Label>
                      <Input value={rxForm.medicamento} onChange={(e) => setRxForm({ ...rxForm, medicamento: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Dosis</Label>
                        <Input value={rxForm.dosis} onChange={(e) => setRxForm({ ...rxForm, dosis: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Frecuencia</Label>
                        <Input value={rxForm.frecuencia} onChange={(e) => setRxForm({ ...rxForm, frecuencia: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Duración</Label>
                        <Input value={rxForm.duracion} onChange={(e) => setRxForm({ ...rxForm, duracion: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenRx(false)}>Cancelar</Button>
                    <Button onClick={handleSavePrescription} disabled={savingRx || !rxForm.paciente || !rxForm.medicamento}>
                      {savingRx ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900">Paciente</th>
                        <th className="text-left p-4 font-medium text-gray-900">Medicamento</th>
                        <th className="text-left p-4 font-medium text-gray-900">Dosis</th>
                        <th className="text-left p-4 font-medium text-gray-900">Frecuencia</th>
                        <th className="text-left p-4 font-medium text-gray-900">Duración</th>
                        <th className="text-left p-4 font-medium text-gray-900">Fecha</th>
                        <th className="text-left p-4 font-medium text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((rx) => (
                        <tr key={String(rx.id)} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900">{rx.paciente}</td>
                          <td className="p-4 text-gray-900">{rx.medicamento}</td>
                          <td className="p-4 text-gray-900">{rx.dosis}</td>
                          <td className="p-4 text-gray-900">{rx.frecuencia}</td>
                          <td className="p-4 text-gray-900">{rx.duracion}</td>
                          <td className="p-4 text-gray-900">{rx.fecha}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleDownloadPrescription(rx)}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { setOpenRx(true); setRxForm({
                                paciente: rx.paciente,
                                medicamento: rx.medicamento,
                                dosis: rx.dosis,
                                frecuencia: rx.frecuencia,
                                duracion: rx.duracion,
                              }); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {prescriptions.length === 0 && (
                        <tr>
                          <td className="p-4 text-sm text-gray-600" colSpan={7}>No hay recetas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consulta */}
          <TabsContent value="consultation" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Nueva Consulta</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Información del Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Seleccionar Paciente</Label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Buscar paciente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={String(p.id)} value={p.nombre}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo de Consulta</Label>
                    <Textarea
                      placeholder="Describe el motivo principal..."
                      value={consult.complaint}
                      onChange={(e) => setConsult((s) => ({ ...s, complaint: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clipboard className="w-5 h-5" />
                    Examen Físico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Presión Arterial</Label>
                      <Input placeholder="120/80" value={exam.bp} onChange={(e) => setExam((s) => ({ ...s, bp: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Frecuencia Cardíaca</Label>
                      <Input placeholder="72 bpm" value={exam.hr} onChange={(e) => setExam((s) => ({ ...s, hr: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperatura</Label>
                      <Input placeholder="36.5°C" value={exam.temp} onChange={(e) => setExam((s) => ({ ...s, temp: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Peso</Label>
                      <Input placeholder="70 kg" value={exam.weight} onChange={(e) => setExam((s) => ({ ...s, weight: e.target.value }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Diagnóstico y Tratamiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Diagnóstico</Label>
                    <Textarea
                      placeholder="Diagnóstico principal y secundarios..."
                      value={consult.diagnosis}
                      onChange={(e) => setConsult((s) => ({ ...s, diagnosis: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plan de Tratamiento</Label>
                    <Textarea
                      placeholder="Medicamentos, procedimientos, recomendaciones..."
                      value={consult.treatment}
                      onChange={(e) => setConsult((s) => ({ ...s, treatment: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas Adicionales</Label>
                    <Textarea
                      placeholder="Observaciones, seguimiento, etc..."
                      value={consult.notes}
                      onChange={(e) => setConsult((s) => ({ ...s, notes: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveConsultation}>
                      <FileText className="w-4 h-4 mr-2" />
                      Guardar Consulta
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpenRx(true);
                        setRxForm((s) => ({ ...s, paciente: selectedPatient || patients[0]?.nombre || '' }));
                      }}
                    >
                      <Pill className="w-4 h-4 mr-2" />
                      Generar Receta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reportes (placeholder) */}
          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Reportes y Estadísticas</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Consultas Este Mes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-4xl font-bold font-heading text-emerald-600">{history.length}</p>
                    <p className="text-gray-600">Total de consultas registradas</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Diagnósticos Más Frecuentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Reemplaza con datos reales cuando tengas API */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Hipertensión arterial</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Diabetes tipo 2</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Arritmias</span>
                    <Badge variant="secondary">6</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
