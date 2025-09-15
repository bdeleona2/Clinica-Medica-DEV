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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Search,
  Plus,
  Edit,
  Download,
  Eye,
  Receipt,
  Calculator,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// ----- Tipos mínimos (ajusta a tu modelo real si quieres tipar más estricto)
type Service = { id: number | string; nombre: string; categoria?: string; precio: number };
type PendingBill = {
  id: number | string;
  paciente: string;
  fecha: string;
  servicios: string[];
  total: number;
  estado: 'pending' | 'paid' | 'overdue';
};
type Transaction = {
  id: number | string;
  paciente: string;
  servicios: string[];
  monto: number;
  metodoPago: 'cash' | 'card' | 'transfer' | 'insurance';
  hora: string;
};
type Stats = {
  ingresosDiarios: number;
  pagosPendientes: number;
  transaccionesCompletadas: number;
  ingresosMensuales: number;
};

// ---- Helpers
async function callSafe<T>(fn: (() => Promise<T>) | undefined, fallback: T): Promise<T> {
  try {
    if (typeof fn === 'function') return await fn();
  } catch (e) {
    console.error(e);
  }
  return fallback;
}

function StatusBadge({ estado }: { estado: PendingBill['estado'] }) {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
  } as const;
  const labels = {
    pending: 'Pendiente',
    paid: 'Pagado',
    overdue: 'Vencido',
  } as const;
  return <Badge className={variants[estado]}>{labels[estado]}</Badge>;
}

export default function CashierDashboard() {
  const router = useRouter();

  // Datos
  const [services, setServices] = useState<Service[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    ingresosDiarios: 0,
    pagosPendientes: 0,
    transaccionesCompletadas: 0,
    ingresosMensuales: 0,
  });

  // UI / formulario
  const [activeTab, setActiveTab] = useState<'billing' | 'pending' | 'transactions' | 'services' | 'reports'>('billing');
  const [selectedServices, setSelectedServices] = useState<(string | number)[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Transaction['metodoPago'] | ''>('');

  // Modal nuevo servicio
  const [openNewService, setOpenNewService] = useState(false);
  const [serviceForm, setServiceForm] = useState<Pick<Service, 'nombre' | 'categoria' | 'precio'>>({
    nombre: '',
    categoria: '',
    precio: 0,
  });
  const [savingService, setSavingService] = useState(false);

  // Carga inicial
  useEffect(() => {
    (async () => {
      // Trae desde API si existe; sino, usa datos de ejemplo
      const svc = await callSafe<Service[]>((api as any)?.services?.list, [
        { id: 1, nombre: 'Consulta general', categoria: 'Consultas', precio: 150 },
        { id: 2, nombre: 'Rayos X', categoria: 'Imagenología', precio: 300 },
        { id: 3, nombre: 'Laboratorio básico', categoria: 'Laboratorio', precio: 200 },
      ]);

      const pend = await callSafe<PendingBill[]>((api as any)?.billing?.pending, [
        {
          id: 101,
          paciente: 'Juan Pérez',
          fecha: new Date().toISOString().slice(0, 10),
          servicios: ['Consulta general'],
          total: 150,
          estado: 'pending',
        },
      ]);

      const txs = await callSafe<Transaction[]>((api as any)?.transactions?.list, [
        {
          id: 5001,
          paciente: 'María López',
          servicios: ['Laboratorio básico'],
          monto: 200,
          metodoPago: 'card',
          hora: '09:30',
        },
      ]);

      setServices(svc);
      setPendingBills(pend);
      setTransactions(txs);
      setStats({
        ingresosDiarios: txs.reduce((a, t) => a + (t.monto || 0), 0),
        pagosPendientes: pend.filter((p) => p.estado !== 'paid').length,
        transaccionesCompletadas: txs.length,
        ingresosMensuales: txs.reduce((a, t) => a + (t.monto || 0), 0), // placeholder
      });
    })();
  }, []);

  // ----- Lógica de UI

  function toggleService(serviceId: string | number) {
    setSelectedServices((prev) => (prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]));
  }

  function calculateTotal() {
    return selectedServices.reduce((total, id) => {
      const s = services.find((x) => String(x.id) === String(id));
      return total + (s?.precio || 0);
    }, 0);
  }

  async function handleProcessPayment() {
    const total = calculateTotal();
    if (!selectedPatient || total <= 0 || !paymentMethod) return;

    // Construir nueva transacción
    const servicioNombres = selectedServices
      .map((id) => services.find((s) => String(s.id) === String(id))?.nombre)
      .filter(Boolean) as string[];

    let created: Transaction;
    if ((api as any)?.billing?.charge) {
      created = await (api as any).billing.charge({
        paciente: selectedPatient,
        servicios: servicioNombres,
        monto: total,
        metodoPago: paymentMethod,
      });
    } else {
      created = {
        id: Date.now(),
        paciente: selectedPatient,
        servicios: servicioNombres,
        monto: total,
        metodoPago: paymentMethod as Transaction['metodoPago'],
        hora: new Date().toTimeString().slice(0, 5),
      };
    }

    setTransactions((prev) => [created, ...prev]);
    setStats((s) => ({
      ...s,
      ingresosDiarios: s.ingresosDiarios + total,
      transaccionesCompletadas: s.transaccionesCompletadas + 1,
      ingresosMensuales: s.ingresosMensuales + total,
    }));
    // limpiar formulario
    setSelectedServices([]);
    setSelectedPatient('');
    setPaymentMethod('');
  }

  function handleExportPendingCSV() {
    const rows = [
      ['ID', 'Paciente', 'Fecha', 'Servicios', 'Total', 'Estado'],
      ...pendingBills.map((p) => [p.id, p.paciente, p.fecha, p.servicios.join(' | '), p.total, p.estado]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagos-pendientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleViewBill(id: PendingBill['id']) {
    router.push(`/billing/${id}`); // ajusta si tienes ruta distinta
  }

  function handleChargeBill(bill: PendingBill) {
    // Marca como pagada y crea transacción
    setPendingBills((prev) =>
      prev.map((b) => (b.id === bill.id ? { ...b, estado: 'paid' } : b)),
    );
    setStats((s) => ({ ...s, pagosPendientes: Math.max(0, s.pagosPendientes - 1) }));

    const tx: Transaction = {
      id: `tx-${bill.id}-${Date.now()}`,
      paciente: bill.paciente,
      servicios: bill.servicios,
      monto: bill.total,
      metodoPago: 'cash',
      hora: new Date().toTimeString().slice(0, 5),
    };
    setTransactions((prev) => [tx, ...prev]);
    setStats((s) => ({
      ...s,
      ingresosDiarios: s.ingresosDiarios + bill.total,
      transaccionesCompletadas: s.transaccionesCompletadas + 1,
      ingresosMensuales: s.ingresosMensuales + bill.total,
    }));
  }

  function handleDownloadReceipt(tx: Transaction) {
    // Comprobante simple (CSV/Texto)
    const text = [
      `Comprobante #${tx.id}`,
      `Paciente: ${tx.paciente}`,
      `Servicios: ${tx.servicios.join(', ')}`,
      `Monto: Q${tx.monto}`,
      `Método: ${tx.metodoPago}`,
      `Hora: ${tx.hora}`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${tx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  async function handleSaveService() {
    if (!serviceForm.nombre || serviceForm.precio <= 0) return;
    setSavingService(true);
    try {
      let created: Service;
      if ((api as any)?.services?.create) {
        created = await (api as any).services.create(serviceForm);
      } else {
        created = { id: Date.now(), ...serviceForm };
      }
      setServices((prev) => [created, ...prev]);
      setOpenNewService(false);
      setServiceForm({ nombre: '', categoria: '', precio: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingService(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-heading text-gray-900">Caja y Facturación</h1>
                <p className="text-sm text-gray-600">Gestión de pagos y servicios</p>
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
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">Q{stats.ingresosDiarios}</p>
                  <p className="text-sm text-gray-600">Ingresos Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.pagosPendientes}</p>
                  <p className="text-sm text-gray-600">Pagos Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">{stats.transaccionesCompletadas}</p>
                  <p className="text-sm text-gray-600">Transacciones Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading text-gray-900">
                    Q{stats.ingresosMensuales.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Ingresos Mensuales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="billing">Nueva Factura</TabsTrigger>
            <TabsTrigger value="pending">Pagos Pendientes</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          {/* Nueva Factura */}
          <TabsContent value="billing" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Nueva Factura</h2>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información del Paciente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="patient-search">Buscar / Ingresar Paciente</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="patient-search"
                          placeholder="Nombre o DPI del paciente..."
                          className="pl-10"
                          value={selectedPatient}
                          onChange={(e) => setSelectedPatient(e.target.value)}
                        />
                      </div>
                    </div>
                    {selectedPatient && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium">{selectedPatient}</p>
                        <p className="text-sm text-gray-600">DPI: — | Teléfono: —</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Servicios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {services.map((servicio) => (
                        <div
                          key={servicio.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedServices.includes(servicio.id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleService(servicio.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{servicio.nombre}</p>
                              <p className="text-sm text-gray-600">{servicio.categoria}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">Q{servicio.precio}</p>
                              {selectedServices.includes(servicio.id) && (
                                <CheckCircle className="w-4 h-4 text-green-600 ml-auto mt-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Resumen de Factura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {selectedServices.map((id) => {
                        const s = services.find((x) => String(x.id) === String(id));
                        return (
                          <div key={String(id)} className="flex justify-between text-sm">
                            <span>{s?.nombre}</span>
                            <span>Q{s?.precio}</span>
                          </div>
                        );
                      })}
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>Q{calculateTotal()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta de Crédito/Débito</SelectItem>
                        <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                        <SelectItem value="insurance">Seguro Médico</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={calculateTotal() === 0 || !selectedPatient || !paymentMethod}
                      onClick={handleProcessPayment}
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Procesar Pago - Q{calculateTotal()}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Pagos Pendientes */}
          <TabsContent value="pending" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Pagos Pendientes</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPendingCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {pendingBills.map((factura) => (
                <Card key={String(factura.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{factura.paciente}</h3>
                          <StatusBadge estado={factura.estado} />
                        </div>
                        <p className="text-gray-600">Fecha: {factura.fecha}</p>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Servicios:</p>
                          <ul className="text-sm text-gray-600">
                            {factura.servicios.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-2xl font-bold text-green-600">Q{factura.total}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewBill(factura.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver
                          </Button>
                          {factura.estado !== 'paid' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleChargeBill(factura)}>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Cobrar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pendingBills.length === 0 && <div className="text-sm text-gray-600">No hay pagos pendientes.</div>}
            </div>
          </TabsContent>

          {/* Transacciones */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Transacciones del Día</h2>
              <div className="flex gap-2">
                <Input placeholder="Buscar transacción..." className="w-64" />
                <Button variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900">Paciente</th>
                        <th className="text-left p-4 font-medium text-gray-900">Servicios</th>
                        <th className="text-left p-4 font-medium text-gray-900">Monto</th>
                        <th className="text-left p-4 font-medium text-gray-900">Método</th>
                        <th className="text-left p-4 font-medium text-gray-900">Hora</th>
                        <th className="text-left p-4 font-medium text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={String(t.id)} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900">{t.paciente}</td>
                          <td className="p-4 text-gray-900">
                            <div className="space-y-1">
                              {t.servicios.map((s, i) => (
                                <div key={i} className="text-sm">
                                  {s}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-green-600">Q{t.monto}</td>
                          <td className="p-4 text-gray-900">{t.metodoPago}</td>
                          <td className="p-4 text-gray-900">{t.hora}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => router.push(`/transactions/${t.id}`)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(t)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td className="p-4 text-sm text-gray-600" colSpan={6}>
                            No hay transacciones.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Servicios */}
          <TabsContent value="services" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold font-heading text-gray-900">Catálogo de Servicios</h2>

              <Dialog open={openNewService} onOpenChange={setOpenNewService}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Servicio
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Servicio</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="svc-nombre">Nombre</Label>
                      <Input
                        id="svc-nombre"
                        value={serviceForm.nombre}
                        onChange={(e) => setServiceForm({ ...serviceForm, nombre: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="svc-cat">Categoría</Label>
                      <Input
                        id="svc-cat"
                        value={serviceForm.categoria}
                        onChange={(e) => setServiceForm({ ...serviceForm, categoria: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="svc-precio">Precio (Q)</Label>
                      <Input
                        id="svc-precio"
                        type="number"
                        min={0}
                        value={serviceForm.precio}
                        onChange={(e) => setServiceForm({ ...serviceForm, precio: Number(e.target.value || 0) })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenNewService(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveService} disabled={savingService || !serviceForm.nombre || serviceForm.precio <= 0}>
                      {savingService ? 'Guardando...' : 'Guardar'}
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
                        <th className="text-left p-4 font-medium text-gray-900">Servicio</th>
                        <th className="text-left p-4 font-medium text-gray-900">Categoría</th>
                        <th className="text-left p-4 font-medium text-gray-900">Precio</th>
                        <th className="text-left p-4 font-medium text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={String(s.id)} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900">{s.nombre}</td>
                          <td className="p-4 text-gray-900">{s.categoria}</td>
                          <td className="p-4 font-bold text-green-600">Q{s.precio}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => alert('Editar pendiente')}>
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {services.length === 0 && (
                        <tr>
                          <td className="p-4 text-sm text-gray-600" colSpan={4}>
                            No hay servicios.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reportes (placeholder visual) */}
          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Reportes Financieros</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Categoría</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Coloca gráficos reales cuando tengas API */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Consultas</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded">
                        <div className="w-16 h-2 bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm font-medium">Q3,600</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Imagenología</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded">
                        <div className="w-12 h-2 bg-green-500 rounded"></div>
                      </div>
                      <span className="text-sm font-medium">Q2,400</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Laboratorio</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded">
                        <div className="w-8 h-2 bg-purple-500 rounded"></div>
                      </div>
                      <span className="text-sm font-medium">Q1,350</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tarjeta</span>
                    <Badge variant="secondary">65%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Efectivo</span>
                    <Badge variant="secondary">25%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Seguro</span>
                    <Badge variant="secondary">10%</Badge>
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
