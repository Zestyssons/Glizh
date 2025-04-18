
// Funciones para manejar las interacciones del dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Cargar configuración inicial
  const guildId = document.querySelector('[data-guild-id]').dataset.guildId;
  loadSettings(guildId);

  // Manejar formularios
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
  });
});

async function loadSettings(guildId) {
  try {
    const response = await fetch(`/api/${guildId}/settings`);
    const data = await response.json();
    if (data.success) {
      populateSettings(data.settings);
    }
  } catch (error) {
    showAlert('Error al cargar la configuración', 'error');
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const guildId = document.querySelector('[data-guild-id]').dataset.guildId;
  const formData = new FormData(form);
  const settings = Object.fromEntries(formData);

  try {
    const endpoint = form.getAttribute('data-endpoint');
    const response = await fetch(`/api/${guildId}/settings/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    const data = await response.json();
    if (data.success) {
      showAlert('Configuración guardada correctamente', 'success');
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    showAlert(`Error al guardar: ${error.message}`, 'error');
  }
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.querySelector('.main-content').prepend(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

function populateSettings(settings) {
  // Poblar configuración de bienvenida
  if (settings.welcome) {
    document.querySelectorAll('[name^="welcome"]').forEach(input => {
      const key = input.name.replace('welcome.', '');
      if (input.type === 'checkbox') {
        input.checked = settings.welcome[key];
      } else {
        input.value = settings.welcome[key] || '';
      }
    });
  }

  // Poblar auto roles
  if (settings.autoroles) {
    document.querySelectorAll('[name^="autoroles"]').forEach(input => {
      const key = input.name.replace('autoroles.', '');
      if (Array.isArray(settings.autoroles[key])) {
        input.value = settings.autoroles[key].join(',');
      } else {
        input.value = settings.autoroles[key] || '';
      }
    });
  }

  // Poblar configuración de logs
  if (settings.logs) {
    document.querySelectorAll('[name^="logs"]').forEach(input => {
      const key = input.name.replace('logs.', '');
      if (input.type === 'checkbox') {
        input.checked = settings.logs[key];
      } else {
        input.value = settings.logs[key] || '';
      }
    });
  }
}
