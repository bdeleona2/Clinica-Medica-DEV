'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Calendar,
  Clock,
  FileText,
  User,
  Phone,
  Stethoscope,
  CalendarPlus,
  Download,
  Eye,
} from 'lucide-react';

// ===== Tipos mínimos (ajusta a tus modelos reales si lo deseas)
type AppointmentStatus = 'confirmed' | 'pending' | 'completed';

type Appointment = {
  id: number | string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm
  doctor: string;
  especialidad: string;
  tipo: string;
  estado: AppointmentStatus;
};

type HistoryRecord = {
  id: number | string;
  doctor: string;
  fecha: string; // YYYY-MM-DD
  diagnostico: string;
  tratamiento: string;
  notas: string;
};

type Result = {
  id: number | string;
  tipo: string;
  doctor: string;
  fecha: string; // YYYY-MM-DD
  estado: 'completed' | 'pending';
};

type PatientProfile = {
  id: number | string;
  nombre: string;
  fechaNacimiento: string;
  tipoSangre: string;
  correo: string;
  telefono: string;
  direccion: string;
  alergias: string[];
};

async function callSafe<T>(fn: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  try {
    if (typeof fn === 'function') return await fn();
  } catch (e) {
    console.error(e);
  }
  return fallback;
}

function StatusBadge({ estado }: { estado: AppointmentStatus | 'completed' | 'pending' }) {
  const variants = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
  } as const;

  const labels = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    completed: 'Completado',
  } as const;

  return <Badge className={variants[estado]}>{labels[estado]}</Badge>;
}

export default function PatientDashboard() {
  const router = useRouter();

  // ===== Datos
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [activeTab, setActiveTab] = useState<'appointments' | 'history' | 'results' | 'profile'>('appointments');

  // ===== Carga inicial con fallbacks
  useEffect(() => {
    (async () => {
      const me = await callSafe<PatientProfile>((api as any)?.patient?.me, {
        id: 99,
        nombre: 'Usuario de Ejemplo',
        fechaNacimiento: '1990-05-20',
        tipoSangre: 'O+',
        correo: 'usuario@example.com',
        telefono: '+502 5555-1234',
        direccion: 'Zona 10, Guatemala',
        alergias: ['Penicilina'],
      });

      const myAppointments = await callSafe<Appointment[]>((api as any)?.appointments?.mine, [
        {
          id: 1,
          fecha: new Date().toISOString().slice(0, 10),
          hora: '09:30',
          doctor: 'Dra. Ana López',
          especialidad: 'Cardiología',
          tipo: 'Control',
          estado: 'confirmed',
        },
        {
          id: 2,
          fecha: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          hora: '11:00',
          doctor: 'Dr. Miguel Torres',
          especialidad: 'Dermatología',
          tipo: 'Primera vez',
          estado: 'pending',
        },
      ]);

      const myHistory = await callSafe<HistoryRecord[]>((api as any)?.history?.mine, [
        {
          id: 101,
          doctor: 'Dra. Ana López',
          fecha: '2025-07-12',
          diagnostico: 'Hipertensión arterial',
          tratamiento: 'Amlodipino 5mg/día',
          notas: 'Control en 1 mes',
        },
        {
          id: 102,
          doctor: 'Dr. Miguel Torres',
          fecha: '2025-03-03',
          diagnostico: 'Dermatitis',
          tratamiento: 'Corticoide tópico 7 días',
          notas: 'Evitar alérgenos',
        },
      ]);

      const myResults = await callSafe<Result[]>((api as any)?.results?.mine, [
        { id: 201, tipo: 'Ecografía', doctor: 'Dra. Julia Pérez', fecha: '2025-08-22', estado: 'completed' },
        { id: 202, tipo: 'Radiografía', doctor: 'Dr. Carlos Ruiz', fecha: '2025-08-02', estado: 'completed' },
      ]);

      setPatient(me);
      setAppointments(myAppointments);
      setHistory(myHistory);
      setResults(myResults);
    })();
  }, []);

  // ===== Derivados para “Quick Stats”
  const todayISO = new Date().toISOString().slice(0, 10);
  const upcomingCount = appointments.filter((a) => a.fecha >= todayISO).length;
  const resultsAvailable = results.filter((r) => r.estado === 'completed').length;
  const visitsThisYear = history.filter((h) => h.fecha.startsWith(String(new Date().getFullYear()))).length;

  // ===== Acciones
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
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
      } catch {}
      router.replace('/');
    }
  }

  function handleNewAppointment() {
    router.push('/appointments/new');
  }

  function handleViewAppointment(id: string | number) {
    router.push(`/appointments/${id}`);
  }

  function handleViewHistory(id: string | number) {
    router.push(`/history/${id}`);
  }

  function handleViewResult(id: string | number) {
    router.push(`/results/${id}`);
  }

  async function handleDownloadResult(res: Result) {
    try {
      if ((api as any)?.results?.download) {
        const blob = await (api as any).results.download(res.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultado-${res.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.error(e);
    }
    // Fallback TXT
    const text = [
      `Resultado #${res.id}`,
      `Tipo: ${res.tipo}`,
      `Doctor: ${res.doctor}`,
      `Fecha: ${res.fecha}`,
      `Estado: ${res.estado === 'completed' ? 'Completado' : 'Pendiente'}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultado-${res.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-heading text-gray-900">Portal del Paciente</h1>
                <p className="text-sm text-gray-600">
                  Bienvenido, {patient?.nombre ?? 'Usuario'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{upcomingCount}</p>
                  <p className="text-sm text-gray-600">Próximas Citas</p>
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
                  <p className="text-2xl font-bold font-heading text-gray-900">{resultsAvailable}</p>
                  <p className="text-sm text-gray-600">Resultados Disponibles</p>
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
                  <p className="text-2xl font-bold font-heading text-gray-900">{visitsThisYear}</p>
                  <p className="text-sm text-gray-600">Consultas Este Año</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments">Citas</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          {/* Citas */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Mis Citas</h2>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleNewAppointment}>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Nueva Cita
              </Button>
            </div>

            <div className="grid gap-4">
              {appointments.map((cita) => (
                <Card key={String(cita.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {cita.fecha} a las {cita.hora}
                          </span>
                          <StatusBadge estado={cita.estado} />
                        </div>
                        <h3 className="font-semibold text-lg">{cita.doctor}</h3>
                        <p className="text-gray-600">
                          {cita.especialidad} - {cita.tipo}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewAppointment(cita.id)}>
                        Ver Detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {appointments.length === 0 && (
                <div className="text-sm text-gray-600">No tienes citas registradas.</div>
              )}
            </div>
          </TabsContent>

          {/* Historial */}
          <TabsContent value="history" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Historial Médico</h2>

            <div className="grid gap-4">
              {history.map((registro) => (
                <Card key={String(registro.id)}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{registro.diagnostico}</h3>
                          <p className="text-gray-600">
                            {registro.doctor} - {registro.fecha}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewHistory(registro.id)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Completo
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p>
                          <span className="font-medium">Tratamiento:</span> {registro.tratamiento}
                        </p>
                        <p>
                          <span className="font-medium">Notas:</span> {registro.notas}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {history.length === 0 && <div className="text-sm text-gray-600">Aún no hay historial.</div>}
            </div>
          </TabsContent>

          {/* Resultados */}
          <TabsContent value="results" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Resultados de Estudios</h2>

            <div className="grid gap-4">
              {results.map((resultado) => (
                <Card key={String(resultado.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{resultado.tipo}</h3>
                        <p className="text-gray-600">
                          {resultado.doctor} - {resultado.fecha}
                        </p>
                        <StatusBadge estado={resultado.estado} />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewResult(resultado.id)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadResult(resultado)}>
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {results.length === 0 && <div className="text-sm text-gray-600">No hay resultados disponibles.</div>}
            </div>
          </TabsContent>

          {/* Perfil */}
          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Mi Perfil</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Información Personal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Nombre Completo</p>
                    <p className="text-gray-900">{patient?.nombre ?? '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Fecha de Nacimiento</p>
                    <p className="text-gray-900">{patient?.fechaNacimiento ?? '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Tipo de Sangre</p>
                    <p className="text-gray-900">{patient?.tipoSangre ?? '—'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Información de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Correo Electrónico</p>
                    <p className="text-gray-900">{patient?.correo ?? '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Teléfono</p>
                    <p className="text-gray-900">{patient?.telefono ?? '—'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Dirección</p>
                    <p className="text-gray-900">{patient?.direccion ?? '—'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Alergias y Condiciones Médicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Alergias Conocidas</p>
                    <div className="flex gap-2 flex-wrap">
                      {(patient?.alergias ?? []).length > 0 ? (
                        patient?.alergias.map((a, i) => (
                          <Badge key={i} variant="secondary" className="bg-red-100 text-red-800">
                            {a}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-600">Sin alergias registradas</span>
                      )}
                    </div>
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
