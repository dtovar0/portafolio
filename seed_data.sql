-- Nexus Access Portal - Master Seed Data Script
-- Optimized for MySQL 8.0+

USE nexus_access;

-- 1. Limpiar datos previos antes de la siembra maestro
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE access_request;
TRUNCATE TABLE platform;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. Master Data: Platforms (Catálogo Corporativo)
INSERT INTO platform (name, description, area, roles, direct_link, owner, resources, visits) VALUES
('AWS Console', 'Gestión de infraestructura cloud y servicios de red.', 'IT / Infra', 'DevOps, Admin', 'https://aws.amazon.com', 'Team Cloud', 'AWS Manual, Cloud Guide', 125),
('Notion', 'Wiki interna, bases de conocimiento y documentación.', 'General', 'Todos', 'https://notion.so', 'Product Ops', 'Notion Workspace Guide', 450),
('Slack', 'Comunicación interna oficial y canales de equipo.', 'General', 'Todos', 'https://slack.com', 'IT Support', 'Slack Tutorial', 890),
('Figma', 'Herramienta de diseño colaborativo para UI/UX.', 'Diseño', 'Diseñadores, PMs', 'https://figma.com', 'Design Lead', 'Figma Handbook', 230),
('Salesforce', 'CRM para gestión de ventas y clientes potenciales.', 'Comercial', 'Sellers, AMs', 'https://salesforce.com', 'Sales Ops', 'CRM Playbook', 110),
('Jira Software', 'Gestión de tareas, sprints y desarrollo técnico.', 'IT / Infra', 'Devs, PMs', 'https://atlassian.com/jira', 'PMO Office', 'Agile Guide', 340),
('Adobe Creative Cloud', 'Paquete de edición gráfica y multimedia.', 'Diseño', 'Diseñadores', 'https://adobe.com', 'Creative Lead', 'Adobe Wiki', 95),
('HubSpot CRM', 'Plataforma de marketing y servicios al cliente.', 'Marketing', 'MKT Team', 'https://hubspot.com', 'Marketing Lead', 'MKT Guide', 145);

-- 3. Master Data: Access Requests (Historial de Auditoría)
INSERT INTO access_request (platform_name, user_name, status, created_at) VALUES
('Salesforce', 'Mariana Ruiz', 'Pendiente', NOW() - INTERVAL 1 HOUR),
('AWS Console', 'Jorge López', 'Pendiente', NOW() - INTERVAL 3 HOUR),
('Figma', 'Sofía Castro', 'Pendiente', NOW() - INTERVAL 5 HOUR),
('Slack', 'Ricardo Pérez', 'Pendiente', NOW() - INTERVAL 8 HOUR),
('Jira Software', 'Elena Gómez', 'Aprobado', NOW() - INTERVAL 1 DAY),
('HubSpot CRM', 'Carlos Sosa', 'Aprobado', NOW() - INTERVAL 2 DAY),
('Azure AD', 'Andrea Mendieta', 'Rechazado', NOW() - INTERVAL 3 DAY),
('Zendesk', 'Luis Valdez', 'Aprobado', NOW() - INTERVAL 4 DAY),
('Adobe Creative Cloud', 'Patricia Rivas', 'Aprobado', NOW() - INTERVAL 5 DAY),
('Microsoft 365', 'Fernando Ruiz', 'Aprobado', NOW() - INTERVAL 1 WEEK),
('Figma', 'Daniela Marín', 'Aprobado', NOW() - INTERVAL 1 WEEK),
('AWS Console', 'Carlos Ruiz', 'Rechazado', NOW() - INTERVAL 1 WEEK),
('Notion', 'Ana Soto', 'Aprobado', NOW() - INTERVAL 2 WEEK),
('Slack', 'Pedro Picapiedra', 'Rechazado', NOW() - INTERVAL 2 WEEK),
('Jira Software', 'Mónica Galindo', 'Aprobado', NOW() - INTERVAL 2 WEEK),
('Salesforce', 'Raúl Domínguez', 'Aprobado', NOW() - INTERVAL 2 WEEK),
('Figma', 'Ximena López', 'Pendiente', NOW() - INTERVAL 1 HOUR),
('Slack', 'Roberto Gómez', 'Pendiente', NOW() - INTERVAL 2 HOUR),
('Salesforce', 'Karla Juárez', 'Aprobado', NOW() - INTERVAL 3 HOUR),
('AWS Console', 'Lucas Martínez', 'Rechazado', NOW() - INTERVAL 4 HOUR);
