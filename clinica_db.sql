-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-09-2025 a las 22:57:38
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `clinica_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `tipo` varchar(255) DEFAULT NULL,
  `estado` enum('pending','confirmed','completed','cancelled') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `appointments`
--

INSERT INTO `appointments` (`id`, `patient_id`, `doctor_id`, `fecha`, `hora`, `tipo`, `estado`, `created_at`) VALUES
(1, 1, 1, '2025-09-11', '09:30:00', 'Dolor de pecho', 'completed', '2025-09-11 16:03:26'),
(2, 2, 2, '2025-09-12', '11:00:00', 'Control pediátrico', 'pending', '2025-09-11 16:03:26'),
(6, 4, 2, '2025-09-14', '09:00:00', 'Consulta', 'confirmed', '2025-09-14 21:54:58'),
(7, 3, 1, '2025-09-18', '09:00:00', 'Diagnostico', 'pending', '2025-09-14 21:56:41'),
(8, 2, 2, '2025-09-19', '09:00:00', 'Dolor de cabeza hijo', 'pending', '2025-09-14 21:59:50'),
(9, 5, 1, '2025-09-14', '09:00:00', 'Consulta', 'confirmed', '2025-09-14 22:04:25'),
(10, 4, 3, '2025-09-15', '09:00:00', 'Revision', 'pending', '2025-09-15 18:19:31'),
(11, 8, 1, '2025-09-17', '11:00:00', 'Consulta prueba', 'confirmed', '2025-09-15 20:47:36');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `doctors`
--

CREATE TABLE `doctors` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `horario` varchar(100) DEFAULT NULL,
  `estado` enum('Activo','Inactivo','Vacaciones') DEFAULT 'Activo',
  `telefono` varchar(30) DEFAULT NULL,
  `correo` varchar(160) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `doctors`
--

INSERT INTO `doctors` (`id`, `nombre`, `especialidad`, `horario`, `estado`, `telefono`, `correo`, `created_at`) VALUES
(1, 'Dr. José Pérez', 'Cardiología', '9a.m', 'Vacaciones', '555-1111', 'j.perez@clinica.com', '2025-09-11 16:03:26'),
(2, 'Dra. María López', 'Pediatría', '12 p.m', 'Activo', '555-2222', 'm.lopez@clinica.com', '2025-09-11 16:03:26'),
(3, 'Dro Candido Perez', 'Neurologia', NULL, 'Activo', '2145871245', 'c.perez@clinica.com', '2025-09-15 18:18:23'),
(5, 'Dra. liseth Lopez', 'Psicologia', NULL, '', '782931974', 'l.lopez@clinica.com', '2025-09-15 20:41:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `imaging_orders`
--

CREATE TABLE `imaging_orders` (
  `id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `modality` varchar(80) DEFAULT NULL,
  `study_name` varchar(160) DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `status` enum('PENDIENTE','EN_PROCESO','COMPLETADO','CANCELADO') DEFAULT 'PENDIENTE',
  `result_text` text DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('PENDIENTE','PAGADA','ANULADA') DEFAULT 'PAGADA',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `medical_records`
--

CREATE TABLE `medical_records` (
  `id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `diagnosis` text DEFAULT NULL,
  `prescription` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `patients`
--

CREATE TABLE `patients` (
  `id` int(11) NOT NULL,
  `nombre` varchar(160) NOT NULL,
  `dpi` varchar(20) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `correo` varchar(160) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `insurance` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `patients`
--

INSERT INTO `patients` (`id`, `nombre`, `dpi`, `dob`, `telefono`, `correo`, `address`, `insurance`, `created_at`, `estado`) VALUES
(1, 'Engels Tiu', '1234567890101', '1999-05-12', '555-3333', 'engels@example.com', '1234', NULL, '2025-09-11 16:03:26', 'active'),
(2, 'Camila Gómez', '2890012345678', '2001-09-01', '555-4444', 'camila@example.com', NULL, NULL, '2025-09-11 16:03:26', 'active'),
(3, 'Juan', '1234567890101', '1999-05-12', '2145871245', 'Juan@example.com', NULL, 'ok', '2025-09-11 23:15:07', 'active'),
(4, 'Pedro', NULL, NULL, '8745125689', 'pedro@example', NULL, NULL, '2025-09-11 23:45:21', 'inactive'),
(5, 'Lukas Perez', NULL, NULL, '8956236589', 'luka@example.com', NULL, NULL, '2025-09-14 20:09:48', 'inactive'),
(6, 'Edwin', NULL, NULL, '7894612', 'ed@example.com', NULL, NULL, '2025-09-14 22:05:41', 'inactive'),
(7, 'Luis Sanabria', NULL, NULL, '9863715', 'lsa@example.com', NULL, NULL, '2025-09-15 18:43:10', 'inactive'),
(8, 'Emilio Chavez', NULL, NULL, '58751266', 'em@example.com', NULL, NULL, '2025-09-15 19:44:40', 'active');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `name` varchar(160) NOT NULL,
  `category` varchar(120) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `services`
--

INSERT INTO `services` (`id`, `name`, `category`, `price`) VALUES
(1, 'Consulta General', 'Consultas', 150.00),
(2, 'Electrocardiograma', 'Imagenología', 350.00),
(3, 'Rayos X Tórax', 'Imagenología', 280.00),
(4, 'Vacuna Influenza', 'Vacunas', 90.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(160) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('patient','doctor','admin','receptionist','cashier','imaging','director') NOT NULL DEFAULT 'patient',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `created_at`) VALUES
(1, 'Admin', 'admin@clinica.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'admin', '2025-09-11 16:03:26'),
(2, 'Recepcion', 'recep@clinica.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'receptionist', '2025-09-11 16:03:26'),
(3, 'Caja', 'caja@clinica.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'cashier', '2025-09-11 16:03:26'),
(4, 'Imagen', 'imagen@clinica.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'imaging', '2025-09-11 16:03:26'),
(5, 'Director', 'director@clinica.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'director', '2025-09-11 16:03:26'),
(6, 'Dr. José Pérez', 'j.perez@clinica.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'doctor', '2025-09-11 16:03:26'),
(7, 'Dra. María López', 'm.lopez@clinica.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'doctor', '2025-09-11 16:03:26'),
(8, 'Engels Tiu', 'engels@example.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'patient', '2025-09-11 16:03:26'),
(9, 'Camila Gómez', 'camila@example.com', '$2a$10$dDEBI0lWrOrCJgAbT4CdOOxynV0ZVFp2JqFW8e63e70QmeYkCjD.u', 'patient', '2025-09-11 16:03:26');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`);

--
-- Indices de la tabla `doctors`
--
ALTER TABLE `doctors`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `imaging_orders`
--
ALTER TABLE `imaging_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`);

--
-- Indices de la tabla `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indices de la tabla `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `service_id` (`service_id`);

--
-- Indices de la tabla `medical_records`
--
ALTER TABLE `medical_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`);

--
-- Indices de la tabla `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `doctors`
--
ALTER TABLE `doctors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `imaging_orders`
--
ALTER TABLE `imaging_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `medical_records`
--
ALTER TABLE `medical_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `patients`
--
ALTER TABLE `patients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `imaging_orders`
--
ALTER TABLE `imaging_orders`
  ADD CONSTRAINT `imaging_orders_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `imaging_orders_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invoice_items_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`);

--
-- Filtros para la tabla `medical_records`
--
ALTER TABLE `medical_records`
  ADD CONSTRAINT `medical_records_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `medical_records_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
