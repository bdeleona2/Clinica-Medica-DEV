"use client"

import React, { useState, useEffect } from "react"


import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Users, Calendar, FileText, BarChart3, CreditCard } from "lucide-react"




type UserRole = "patient" | "doctor" | "admin" | "receptionist" | "cashier" | "imaging" | "director"

const roleConfig = {
  patient: {
    title: "Portal del Paciente",
    description: "Accede a tus citas, historial médico y servicios",
    icon: Users,
    color: "text-blue-600",
    route: "/patient",
  },
  doctor: {
    title: "Portal Médico",
    description: "Gestiona consultas, historiales y diagnósticos",
    icon: Stethoscope,
    color: "text-emerald-600",
    route: "/doctor",
  },
  admin: {
    title: "Administración",
    description: "Gestión de personal, médicos y servicios",
    icon: FileText,
    color: "text-purple-600",
    route: "/admin",
  },
  receptionist: {
    title: "Recepción",
    description: "Gestión de citas y atención al paciente",
    icon: Calendar,
    color: "text-orange-600",
    route: "/receptionist",
  },
  cashier: {
    title: "Caja",
    description: "Facturación y registro de pagos",
    icon: CreditCard,
    color: "text-green-600",
    route: "/cashier",
  },
  imaging: {
    title: "Imagenología",
    description: "Gestión de estudios y diagnósticos por imagen",
    icon: FileText,
    color: "text-cyan-600",
    route: "/imaging",
  },
  director: {
    title: "Dirección Clínica",
    description: "Reportes, análisis y gestión estratégica",
    icon: BarChart3,
    color: "text-red-600",
    route: "/director",
  },
}

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole>("patient")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const { token, user } = await api.login(email, password)
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(user))
      }
      router.push(`/${user.role}`)
    } catch (err: any) {
      setError(err.message ?? "Error de autenticación")
    } finally {
      setIsLoading(false)
    }
  }

  const currentRole = roleConfig[selectedRole]
  const IconComponent = currentRole.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-heading text-gray-900">Tu Salud, Nuestra Prioridad</h1>
          <p className="text-gray-600">Gestión integral para pacientes, médicos y personal</p>
        </div>

        {/* Role Selection */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-heading">Tipo de Usuario</CardTitle>
            <CardDescription>Selecciona tu rol para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleConfig).map(([role, config]) => {
                  const Icon = config.icon
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span>{config.title}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <IconComponent className={`w-6 h-6 ${currentRole.color}`} />
              <div>
                <CardTitle className="font-heading">{currentRole.title}</CardTitle>
                <CardDescription>{currentRole.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-medium" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>¿Necesitas ayuda? Contacta al administrador</p>
        </div>
      </div>
    </div>
  )
}