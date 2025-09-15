'use client';

import { useEffect, useRef, useState } from 'react';
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
  Camera,
  FileImage,
  Upload,
  Download,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// ===== Tipos mínimos (ajusta a tu modelo)
type StudyStatus = 'pending' | 'in-progress' | 'completed';
type Priority = 'normal' | 'urgent';

type Study = {
  id: string | number;
  patientId?: string | number;
  patient: string;
  doctor?: string;
  studyType: string;
  scheduledTime: string; // HH:mm
  status: StudyStatus;
  priority: Priority;
};

type Report = {
  id: string | number;
  patient: string;
  studyType: string;
  date: string; // YYYY-MM-DD
  findings: string;
  status: 'pending' | 'completed';
  studyId?: string | number;
};

type Stats = {
  todayStudies: number;
  pendingReports: number;
  completedStudies: number;
  equipmentActive: number;
};

async function callSafe<T>(fn: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  try {
    if (typeof fn === 'function') return await fn();
  } catch (e) {
    console.error(e);
  }
  return fallback;
}

function StatusBadge({ status }: { status: StudyStatus }) {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  } as const;
  const labels = {
    pending: 'Pendiente',
    'in-progress': 'En Proceso',
    completed: 'Completado',
  } as const;
  return <Badge className={variants[status]}>{labels[status]}</Badge>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const variants = {
    normal: 'bg-gray-100 text-gray-800',
    urgent: 'bg-red-100 text-red-800',
  } as const;
  const labels = { normal: 'Normal', urgent: 'Urgente' } as const;
  return <Badge className={variants[priority]}>{labels[priority]}</Badge>;
}

export default function ImagingDashboard() {
  const router = useRouter();

  // ==== Datos
  const [stats, setStats] = useState<Stats>({
    todayStudies: 0,
    pendingReports: 0,
    completedStudies: 0,
    equipmentActive: 0,
  });
  const [studies, setStudies] = useState<Study[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // ==== UI
  const [activeTab, setActiveTab] = useState<'studies' | 'upload' | 'reports' | 'equipment'>('studies');
  const [uploadForm, setUploadForm] = useState({
    patient: '',
    studyType: '',
    equipment: '',
    technician: '',
    observations: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==== Carga inicial (con fallbacks si no hay API)
  useEffect(() => {
    (async () => {
      const s = await callSafe<Study[]>((api as any)?.imaging?.listStudies, [
        {
          id: 1,
          patient: 'María González',
          doctor: 'Dra. Ana López',
          studyType: 'Radiografía',
          scheduledTime: '09:15',
          status: 'pending',
          priority: 'normal',
        },
        {
          id: 2,
          patient: 'Carlos Ruiz',
          doctor: 'Dr. Miguel Torres',
          studyType: 'TAC',
          scheduledTime: '10:00',
          status: 'in-progress',
          priority: 'urgent',
        },
        {
          id: 3,
          patient: 'Ana López',
          doctor: 'Dra. Julia Pérez',
          studyType: 'Ecografía',
          scheduledTime: '11:30',
          status: 'completed',
          priority: 'normal',
        },
      ]);

      const r = await callSafe<Report[]>((api as any)?.imaging?.listReports, [
        {
          id: 301,
          patient: 'Ana López',
          studyType: 'Ecografía',
          date: new Date().toISOString().slice(0, 10),
          findings: 'Estructuras normales sin hallazgos patológicos.',
          status: 'completed',
          studyId: 3,
        },
      ]);

      const st = await callSafe<Stats>((api as any)?.imaging?.getStats, {
        todayStudies: s.length,
        pendingReports: r.filter((x) => x.status !== 'completed').length,
        completedStudies: s.filter((x) => x.status === 'completed').length,
        equipmentActive: 2,
      });

      setStudies(s);
      setReports(r);
      setStats(st);
    })();
  }, []);

  // ==== Handlers
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

  async function handleStartStudy(study: Study) {
    try {
      if ((api as any)?.imaging?.start) {
        await (api as any).imaging.start(study.id);
      }
      setStudies((prev) =>
        prev.map((s) => (s.id === study.id ? { ...s, status: 'in-progress' as StudyStatus } : s)),
      );
    } catch (e) {
      console.error(e);
    }
  }

  function goToUpload(study: Study) {
    // Prefill y cambiar de tab
    setUploadForm((f) => ({
      ...f,
      patient: study.patient,
      studyType: study.studyType,
      technician: '',
      equipment: '',
      observations: '',
    }));
    setSelectedFiles([]);
    setActiveTab('upload');
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFiles(files);
  }

  async function handleSubmitUpload() {
    if (!uploadForm.patient || !uploadForm.studyType || selectedFiles.length === 0) return;

    try {
      if ((api as any)?.imaging?.upload) {
        const form = new FormData();
        form.append('patient', uploadForm.patient);
        form.append('studyType', uploadForm.studyType);
        form.append('equipment', uploadForm.equipment);
        form.append('technician', uploadForm.technician);
        form.append('observations', uploadForm.observations);
        selectedFiles.forEach((f) => form.append('files', f));
        await (api as any).imaging.upload(form);
      }

      // Fallback: marcar como completado y crear reporte básico
      const completedId =
        studies.find(
          (s) => s.patient === uploadForm.patient && s.studyType === uploadForm.studyType && s.status !== 'completed',
        )?.id ?? Date.now();

      setStudies((prev) =>
        prev.map((s) =>
          s.id === completedId ? { ...s, status: 'completed' as StudyStatus } : s,
        ),
      );
      setReports((prev) => [
        {
          id: `rep-${completedId}`,
          studyId: completedId,
          patient: uploadForm.patient,
          studyType: uploadForm.studyType,
          date: new Date().toISOString().slice(0, 10),
          findings: uploadForm.observations || '—',
          status: 'completed',
        },
        ...prev,
      ]);
      setStats((st) => ({
        ...st,
        completedStudies: st.completedStudies + 1,
        pendingReports: Math.max(0, st.pendingReports - 1),
      }));

      // Reset
      setUploadForm({ patient: '', studyType: '', equipment: '', technician: '', observations: '' });
      setSelectedFiles([]);
      setActiveTab('studies');
    } catch (e) {
      console.error(e);
    }
  }

  function handleViewImagesByStudy(study: Study) {
    // Si tienes visor, navega allí. Fallback: alerta.
    const path = `/imaging/study/${study.id}`;
    router.push(path);
  }

  function handleViewImagesByReport(report: Report) {
    const path = report.studyId ? `/imaging/study/${report.studyId}` : `/imaging/report/${report.id}`;
    router.push(path);
  }

  async function handleDownloadReport(report: Report) {
    try {
      if ((api as any)?.imaging?.downloadReport) {
        const blob = await (api as any).imaging.downloadReport(report.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${report.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.error(e);
    }
    // Fallback TXT
    const lines = [
      `Reporte #${report.id}`,
      `Paciente: ${report.patient}`,
      `Estudio: ${report.studyType}`,
      `Fecha: ${report.date}`,
      `Hallazgos: ${report.findings}`,
      `Estado: ${report.status}`,
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${report.id}.txt`;
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
              <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-heading text-gray-900">Imagenología</h1>
                <p className="text-sm text-gray-600">Gestión de estudios y diagnósticos por imagen</p>
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
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.todayStudies}</p>
                  <p className="text-sm text-gray-600">Estudios Hoy</p>
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
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.pendingReports}</p>
                  <p className="text-sm text-gray-600">Reportes Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.completedStudies}</p>
                  <p className="text-sm text-gray-600">Completados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Camera className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.equipmentActive}</p>
                  <p className="text-sm text-gray-600">Equipos Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="studies">Estudios del Día</TabsTrigger>
            <TabsTrigger value="upload">Subir Imágenes</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
            <TabsTrigger value="equipment">Equipos</TabsTrigger>
          </TabsList>

          {/* Studies */}
          <TabsContent value="studies" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Estudios Programados</h2>

            <div className="grid gap-4">
              {studies.map((study) => (
                <Card key={String(study.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{study.scheduledTime}</span>
                          <StatusBadge status={study.status} />
                          <PriorityBadge priority={study.priority} />
                        </div>
                        <h3 className="font-semibold text-lg">{study.patient}</h3>
                        <p className="text-gray-600">
                          {study.studyType} {study.doctor ? `- Solicitado por ${study.doctor}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {study.status === 'pending' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStartStudy(study)}>
                            Iniciar Estudio
                          </Button>
                        )}
                        {study.status === 'in-progress' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => goToUpload(study)}>
                            <Upload className="w-4 h-4 mr-2" />
                            Subir Imágenes
                          </Button>
                        )}
                        {study.status === 'completed' && (
                          <Button variant="outline" size="sm" onClick={() => handleViewImagesByStudy(study)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Imágenes
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {studies.length === 0 && <div className="text-sm text-gray-600">No hay estudios programados.</div>}
            </div>
          </TabsContent>

          {/* Upload */}
          <TabsContent value="upload" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Subir Imágenes</h2>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Paciente</Label>
                        <Input
                          placeholder="Nombre del paciente"
                          value={uploadForm.patient}
                          onChange={(e) => setUploadForm((f) => ({ ...f, patient: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Estudio</Label>
                        <Select
                          value={uploadForm.studyType}
                          onValueChange={(v) => setUploadForm((f) => ({ ...f, studyType: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Radiografía">Radiografía</SelectItem>
                            <SelectItem value="Ecografía">Ecografía</SelectItem>
                            <SelectItem value="TAC">TAC</SelectItem>
                            <SelectItem value="Resonancia Magnética">Resonancia Magnética</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Equipo Utilizado</Label>
                        <Select
                          value={uploadForm.equipment}
                          onValueChange={(v) => setUploadForm((f) => ({ ...f, equipment: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar equipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Rayos X - Sala 1">Rayos X - Sala 1</SelectItem>
                            <SelectItem value="Ecógrafo - Sala 2">Ecógrafo - Sala 2</SelectItem>
                            <SelectItem value="TAC - Sala 3">TAC - Sala 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Técnico Responsable</Label>
                        <Input
                          placeholder="Nombre del técnico"
                          value={uploadForm.technician}
                          onChange={(e) => setUploadForm((f) => ({ ...f, technician: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* File Upload Area */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={onFilesSelected}
                    accept=".jpg,.jpeg,.png,.dcm,.tif,.tiff,.bmp,.gif,.pdf"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">Subir Imágenes del Estudio</p>
                    <p className="text-gray-600 mb-4">Arrastra y suelta o haz clic para seleccionar</p>
                    <Button variant="outline" onClick={openFilePicker}>
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar Archivos
                    </Button>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 text-sm text-gray-700">
                        <p className="font-medium mb-1">Archivos seleccionados:</p>
                        <ul className="max-h-28 overflow-auto text-left inline-block">
                          {selectedFiles.map((f, i) => (
                            <li key={i}>• {f.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Observaciones Técnicas</Label>
                    <Textarea
                      placeholder="Notas sobre calidad, posicionamiento, etc."
                      value={uploadForm.observations}
                      onChange={(e) => setUploadForm((f) => ({ ...f, observations: e.target.value }))}
                    />
                  </div>

                  <Button className="w-full bg-cyan-600 hover:bg-cyan-700" onClick={handleSubmitUpload}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Estudio Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Reportes Radiológicos</h2>

            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={String(report.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{report.patient}</h3>
                          <Badge className={report.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {report.status === 'completed' ? 'Completado' : 'Pendiente'}
                          </Badge>
                        </div>
                        <p className="text-gray-600">
                          {report.studyType} - {report.date}
                        </p>
                        <p className="text-sm text-gray-600">{report.findings}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewImagesByReport(report)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Imágenes
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report)}>
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {reports.length === 0 && <div className="text-sm text-gray-600">No hay reportes.</div>}
            </div>
          </TabsContent>

          {/* Equipment */}
          <TabsContent value="equipment" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Estado de Equipos</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Rayos X - Sala 1
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge className="bg-green-100 text-green-800">Operativo</Badge>
                    <p className="text-sm text-gray-600">Último mantenimiento: 2025-08-15</p>
                    <p className="text-sm text-gray-600">Estudios hoy: 8</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Ecógrafo - Sala 2
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge className="bg-green-100 text-green-800">Operativo</Badge>
                    <p className="text-sm text-gray-600">Último mantenimiento: 2025-08-20</p>
                    <p className="text-sm text-gray-600">Estudios hoy: 4</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    TAC - Sala 3
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge className="bg-yellow-100 text-yellow-800">Mantenimiento</Badge>
                    <p className="text-sm text-gray-600">Mantenimiento programado</p>
                    <p className="text-sm text-gray-600">Disponible: 2025-09-20</p>
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
