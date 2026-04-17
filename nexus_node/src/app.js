const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const {
    getSystemSettings,
    getGeneralSettings,
    updateGeneralSettings,
    testDbConnection,
    getNotificationSettings,
    updateNotificationSettings,
    testEmailSettings,
    getAuthSettings,
    updateAuthSettings,
    testLdapConnection
} = require('./controllers/settingsController');

// Log redirection
const logFile = fs.createWriteStream(path.join(__dirname, '../auth_debug.log'), { flags: 'a' });
const originalWrite = process.stdout.write;
process.stdout.write = process.stderr.write = function() {
    logFile.write.apply(logFile, arguments);
    return originalWrite.apply(process.stdout, arguments);
};

fs.appendFileSync(path.join(__dirname, '../auth_debug.log'), `\n--- SERVIDOR REINICIADO: ${new Date().toISOString()} ---\n`);

const { login, logout } = require('./controllers/authController');
const { protect, adminOnly, globalLocals } = require('./middlewares/authMiddleware');

const { getAreas, getAreasApi, addArea, editArea, deleteArea } = require('./controllers/areaController');
const { getPlatforms, addPlatform, editPlatform, deletePlatform } = require('./controllers/platformController');
const { getDashboard } = require('./controllers/dashboardController');
const { globalSearch } = require('./controllers/searchController');
const {
    getUsers,
    addUser,
    editUser,
    deleteUser,
    getUserAreas,
    getUserAccess,
    updateUserAccess,
    ldapSearchApi,
    importLdapUser
} = require('./controllers/userController');
const { getRequests, approveRequest, rejectRequest } = require('./controllers/requestController');
const { getAudit } = require('./controllers/auditController');
const { getCatalog, submitRequest, registerVisit } = require('./controllers/catalogController');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup (EJS)
app.set('view engine', 'ejs');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);
app.set('layout', 'layout'); 
app.use(expressLayouts);
app.set('views', path.join(__dirname, '../views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// Handle multipart/form-data (FormData) as text fields only
const multer = require('multer');
app.use(multer().none());

// Static Files
app.use('/static', express.static(path.join(__dirname, '../public')));

// Request Logger
app.use((req, res, next) => {
    fs.appendFileSync(path.join(__dirname, '../auth_debug.log'), `[Request] ${req.method} ${req.url}\n`);
    next();
});

// Global Settings Middleware
app.use(async (req, res, next) => {
    res.locals.settings = await getSystemSettings();
    next();
});

// Global UI Locals (pending badge, etc.)
app.use(globalLocals);

// --- Public Routes ---
app.get('/login', (req, res) => res.render('login', { layout: false }));
app.post('/login', login);
app.get('/logout', logout);

// --- Protected Routes ---
app.get('/', protect, (req, res, next) => {
    if (req.user.role !== 'Administrador') {
        return res.redirect('/catalogo');
    }
    return next();
}, getDashboard);

app.get('/areas', protect, adminOnly, getAreas);
app.get('/admin/areas', protect, adminOnly, getAreas);
app.get('/admin/areas-api', protect, adminOnly, getAreasApi);
app.post('/admin/add-area', protect, adminOnly, addArea);
app.post('/admin/edit-area/:id', protect, adminOnly, editArea);
app.post('/admin/delete-area/:id', protect, adminOnly, deleteArea);

app.get('/platforms', protect, adminOnly, getPlatforms);
app.get('/admin/platforms', protect, adminOnly, getPlatforms);
app.post('/admin/add-platform', protect, adminOnly, addPlatform);
app.post('/admin/edit-platform/:id', protect, adminOnly, editPlatform);
app.post('/admin/delete-platform/:id', protect, adminOnly, deletePlatform);
app.get('/api/search', protect, globalSearch);

app.get('/users', protect, adminOnly, getUsers);
app.get('/admin/users', protect, adminOnly, getUsers);
app.post('/admin/add-user', protect, adminOnly, addUser);
app.post('/admin/edit-user/:id', protect, adminOnly, editUser);
app.post('/admin/delete-user/:id', protect, adminOnly, deleteUser);
app.get('/admin/user-areas/:id', protect, adminOnly, getUserAreas);
app.get('/admin/user-access/:user_id', protect, adminOnly, getUserAccess);
app.post('/admin/update-user-access/:user_id', protect, adminOnly, updateUserAccess);
app.get('/admin/ldap-search-api', protect, adminOnly, ldapSearchApi);
app.post('/admin/import-ldap-user', protect, adminOnly, importLdapUser);

app.get('/requests', protect, adminOnly, getRequests);
app.get('/admin/requests', protect, adminOnly, getRequests);
app.get('/admin/request/approve/:id', protect, adminOnly, approveRequest);
app.get('/admin/request/reject/:id', protect, adminOnly, rejectRequest);

app.get('/catalogo', protect, getCatalog);
app.post('/api/request-access', protect, submitRequest);
app.get('/platform/visit/:id', protect, registerVisit);

app.get('/admin/general', protect, adminOnly, getGeneralSettings);
app.post('/admin/update-general', protect, adminOnly, updateGeneralSettings);
app.post('/admin/test-db', protect, adminOnly, testDbConnection);

app.get('/admin/notifications', protect, adminOnly, getNotificationSettings);
app.post('/admin/update-notifications', protect, adminOnly, updateNotificationSettings);
app.post('/admin/test-email', protect, adminOnly, testEmailSettings);

app.get('/admin/auth', protect, adminOnly, getAuthSettings);
app.post('/admin/update-auth', protect, adminOnly, updateAuthSettings);
app.post('/admin/test-ldap', protect, adminOnly, testLdapConnection);

app.get('/admin/audit', protect, adminOnly, getAudit);
app.get('/audit', protect, adminOnly, getAudit);

app.listen(PORT, () => {
    console.log(`\x1b[32m[Nexus Node]\x1b[0m Servidor iniciado en http://localhost:${PORT}`);
    console.log(`\x1b[36m[Status]\x1b[0m Conectado a base de datos: ${process.env.DB_NAME}`);
    console.log(`\x1b[36m[Config]\x1b[0m Portal: ${process.env.DB_HOST}`);
});
