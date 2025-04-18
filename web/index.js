
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

function setupWebServer(client) {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Configurar middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Configurar EJS como motor de vistas
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  
  // Ruta de estado para mantener el Repl activo
  app.get('/status', (req, res) => {
    res.status(200).send('¡El bot está en línea!');
  });

  // Configurar sesión
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'glizh-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 86400000 } // 24 horas
    })
  );

  // Configurar Passport para autenticación con Discord
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  const scopes = ['identify', 'guilds'];
  const prompt = 'consent';

  passport.use(
    new Strategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID || client.user.id,
        clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
        callbackURL: process.env.CALLBACK_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/callback`,
        scope: scopes,
        prompt: 'consent'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          return done(null, profile);
        } catch (err) {
          console.error('Error en autenticación:', err);
          return done(err, null);
        }
      }
    )
  );

  // Middleware para verificar autenticación
  function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/login');
  }

  // Rutas de autenticación
  app.get('/auth/login', passport.authenticate('discord', { scope: scopes, prompt: prompt }));

  app.get(
    '/auth/callback',
    (req, res, next) => {
      passport.authenticate('discord', { failureRedirect: '/' }, (err, user) => {
        if (err) {
          console.error('Error en autenticación:', err);
          return res.redirect('/?error=auth_failed');
        }
        if (!user) {
          return res.redirect('/?error=no_user');
        }
        req.logIn(user, (err) => {
          if (err) {
            console.error('Error en login:', err);
            return res.redirect('/?error=login_failed');
          }
          return res.redirect('/dashboard');
        });
      })(req, res, next);
    }
  );

  app.get('/logout', (req, res) => {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

  // Rutas principales
  app.get('/', (req, res) => {
    res.render('index', {
      user: req.user,
      bot: client
    });
  });

  app.get('/dashboard', checkAuth, (req, res) => {
    res.render('dashboard', {
      user: req.user,
      bot: client
    });
  });

  // Ruta para gestionar configuración de servidores específicos
  app.get('/dashboard/:guildId', checkAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const userGuilds = req.user.guilds;
    
    // Verificar si el usuario tiene acceso a este servidor
    const guild = userGuilds.find(g => g.id === guildId && (g.permissions & 0x8) === 0x8);
    
    if (!guild) {
      return res.redirect('/dashboard');
    }
    
    // Verificar si el bot está en este servidor
    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) {
      return res.redirect('/dashboard');
    }
    
    res.render('guildSettings', {
      user: req.user,
      guild: botGuild,
      bot: client
    });
  });

  // API para operaciones CRUD en la configuración del servidor
  app.post('/api/:guildId/settings/welcome', checkAuth, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const settings = req.body;
      await Welcome.findOneAndUpdate({ guildId }, settings, { upsert: true });
      res.json({ success: true, message: 'Configuración de bienvenida actualizada' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/:guildId/settings/autoroles', checkAuth, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const settings = req.body;
      await AutoRoles.findOneAndUpdate({ guildId }, settings, { upsert: true });
      res.json({ success: true, message: 'Auto roles actualizados' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/:guildId/settings/logs', checkAuth, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const settings = req.body;
      await ServerLogs.findOneAndUpdate({ guildId }, settings, { upsert: true });
      res.json({ success: true, message: 'Configuración de logs actualizada' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/api/:guildId/settings', checkAuth, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const welcome = await Welcome.findOne({ guildId });
      const autoroles = await AutoRoles.findOne({ guildId });
      const logs = await ServerLogs.findOne({ guildId });
      
      res.json({
        success: true,
        settings: {
          welcome: welcome || {},
          autoroles: autoroles || {},
          logs: logs || {}
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Configuración para el servidor web
  app.set('host', '0.0.0.0');
  app.set('port', process.env.PORT || 3000);
  
  return app;
}

module.exports = setupWebServer;
