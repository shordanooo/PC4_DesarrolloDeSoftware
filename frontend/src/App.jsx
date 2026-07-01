import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

// Fallback data when backend is not running or offline
const MOCK_PETS = [
  {
    _id: "mock-pet-1",
    name: "Fido (Mock)",
    species: "Perro",
    breed: "Golden Retriever",
    description: "Golden retriever con collar rojo. Se asustó con los cohetes.",
    lat: -12.0460,
    lon: -77.0425,
    photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400",
    status: "lost",
    sightings: []
  }
];

const MOCK_CARETAKERS = [
  {
    _id: "mock-care-1",
    name: "Carlos Gomez (Mock Solidario)",
    email: "carlos.solidario@gmail.com",
    role: "Cuidador Solidario",
    lat: -12.0470,
    lon: -77.0430,
    species_accepted: ["Perro", "Gato"],
    sizes_accepted: ["pequeño", "mediano"],
    administers_medication: false,
    is_verified: true,
    alert_notifications_enabled: true,
    ratings: [{"score": 5, "comment": "Excelente cuidador, muy cariñoso.", "verified": True}],
    average_rating: 5.0,
    role_rules: {
      max_pets: 2,
      max_sizes: ["pequeño", "mediano"],
      allow_payment: false,
      requires_certification: false
    }
  },
  {
    _id: "mock-care-2",
    name: "Ana Perez (Mock Especializada)",
    email: "ana.especializada@gmail.com",
    role: "Cuidador Especializado",
    lat: -12.0450,
    lon: -77.0410,
    species_accepted: ["Perro"],
    sizes_accepted: ["pequeño", "mediano", "grande"],
    administers_medication: true,
    is_verified: true,
    alert_notifications_enabled: true,
    ratings: [
      {"score": 5, "comment": "Muy profesional e instruida.", "verified": True},
      {"score": 4, "comment": "Muy buen servicio.", "verified": True}
    ],
    average_rating: 4.5,
    role_rules: {
      max_pets: 10,
      max_sizes: ["pequeño", "mediano", "grande", "gigante"],
      allow_payment: true,
      requires_certification: true
    }
  }
];

export default function App() {
  const [tab, setTab] = useState('inicio');
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickerMessage, setTickerMessage] = useState('Ninguna alerta reciente.');

  // Data States
  const [lostPets, setLostPets] = useState([]);
  const [caretakers, setCaretakers] = useState([]);
  const [unverifiedCaretakers, setUnverifiedCaretakers] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 1, message: "Sistema inicializado en modo demostración.", type: "system", read: false }
  ]);
  const [searchResults, setSearchResults] = useState(null);

  // Modals & Sighting trigger
  const [selectedPetForSighting, setSelectedPetForSighting] = useState(null);

  // Form States - Lost Pet
  const [petForm, setPetForm] = useState({
    name: '',
    species: 'Perro',
    breed: '',
    description: '',
    lat: -12.0463,
    lon: -77.0427,
    photo: '',
    owner_id: 'owner_user_99'
  });

  // Form States - Caretaker
  const [caretakerForm, setCaretakerForm] = useState({
    name: '',
    email: '',
    role: 'Cuidador Solidario',
    lat: -12.0463,
    lon: -77.0427,
    species_accepted: 'Perro, Gato',
    sizes_accepted: 'pequeño, mediano',
    administers_medication: false,
    id_document: ''
  });

  // Form States - Sighting
  const [sightingForm, setSightingForm] = useState({
    lat: -12.0463,
    lon: -77.0427,
    photo: '',
    description: ''
  });

  // Form States - Image Search
  const [searchForm, setSearchForm] = useState({
    intent: 'Adopción',
    file: null,
    previewUrl: null
  });

  // Form States - Review
  const [reviewForm, setReviewForm] = useState({
    score: 5,
    comment: '',
    reviewer_name: ''
  });

  // Check Backend Status & Load Data
  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_BASE}/`);
      if (res.ok) {
        setIsBackendOnline(true);
        fetchData();
      } else {
        loadMockData();
      }
    } catch (e) {
      loadMockData();
    }
  };

  const loadMockData = () => {
    setIsBackendOnline(false);
    setLostPets(MOCK_PETS);
    setCaretakers(MOCK_CARETAKERS);
    addNotification("Backend offline. Ejecutando en modo MOCK local.", "system");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Lost Pets
      const petsRes = await fetch(`${API_BASE}/api/lost-pets`);
      const petsData = await petsRes.json();
      setLostPets(petsData);

      // Update ticker message if there are alerts
      if (petsData.length > 0) {
        const latest = petsData[petsData.length - 1];
        setTickerMessage(`¡Mascota perdida reciente! ${latest.name} (${latest.breed}) reportado en lat: ${latest.lat}, lon: ${latest.lon}`);
      }

      // Fetch Caretakers
      const careRes = await fetch(`${API_BASE}/api/caretakers`);
      const careData = await careRes.json();
      setCaretakers(careData.filter(c => c.is_verified));
      setUnverifiedCaretakers(careData.filter(c => !c.is_verified));
      
      setIsBackendOnline(true);
    } catch (e) {
      console.error(e);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (message, type = "info") => {
    setNotifications(prev => [
      { id: Date.now(), message, type, read: false },
      ...prev
    ]);
  };

  const handleSeed = async () => {
    if (!isBackendOnline) {
      alert("El backend está desconectado. Inicia el servidor FastAPI con MongoDB.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/seed`, { method: 'POST' });
      if (res.ok) {
        addNotification("¡Base de datos MongoDB inicializada con datos semilla!", "success");
        await fetchData();
      }
    } catch (e) {
      alert("Error al inicializar la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // Convert image file to base64
  const handleFileChange = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Lost Pet Actions
  const handleCreateLostPet = async (e) => {
    e.preventDefault();
    const start = Date.now();
    
    if (!petForm.photo) {
      // Use fallback default image if not uploaded
      petForm.photo = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400";
    }

    if (!isBackendOnline) {
      const newPet = {
        _id: `mock-pet-${Date.now()}`,
        ...petForm,
        status: "lost",
        sightings: []
      };
      setLostPets(prev => [...prev, newPet]);
      setTickerMessage(`[Mock] ¡Mascota perdida! ${newPet.name} (${newPet.breed})`);
      addNotification(`[Mock - Observer] Notificación enviada a vecinos cercanos.`, "success");
      alert("Mascota reportada con éxito (Modo Mock).");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/lost-pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petForm)
      });
      if (res.ok) {
        const data = await res.json();
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        addNotification(`¡Mascota registrada y notificaciones enviadas a vecinos! Latencia: ${duration}s (RNF 1.1)`, "success");
        alert(`Mascota registrada con éxito en ${duration} segundos.`);
        setPetForm({
          name: '',
          species: 'Perro',
          breed: '',
          description: '',
          lat: -12.0463,
          lon: -77.0427,
          photo: '',
          owner_id: 'owner_user_99'
        });
        await fetchData();
      }
    } catch (e) {
      alert("Error al reportar mascota.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Anonymous Sighting Actions
  const handleCreateSighting = async (e) => {
    e.preventDefault();
    if (!sightingForm.photo) {
      sightingForm.photo = "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400";
    }
    const payload = {
      lost_pet_id: selectedPetForSighting._id,
      ...sightingForm
    };

    if (!isBackendOnline) {
      // Update local state
      setLostPets(prev => prev.map(p => {
        if (p._id === selectedPetForSighting._id) {
          return {
            ...p,
            sightings: [...(p.sightings || []), { _id: `mock-sight-${Date.now()}`, ...sightingForm }]
          };
        }
        return p;
      }));
      addNotification(`[Mock] Avistamiento anónimo registrado para ${selectedPetForSighting.name}.`, "info");
      alert("Avistamiento reportado con éxito (Anónimo).");
      setSelectedPetForSighting(null);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/lost-pets/sightings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addNotification(`Avistamiento anónimo registrado para la mascota.`, "success");
        alert("Avistamiento reportado con éxito. Gracias por tu ayuda.");
        setSightingForm({ lat: -12.0463, lon: -77.0427, photo: '', description: '' });
        setSelectedPetForSighting(null);
        await fetchData();
      }
    } catch (e) {
      alert("Error al registrar avistamiento.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Image Search Actions
  const handleImageSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchForm.file && !searchForm.previewUrl) {
      alert("Por favor selecciona una imagen para realizar la búsqueda.");
      return;
    }

    if (!isBackendOnline) {
      // Simulate Strategy search locally
      const isDog = true; // Mock assumption
      let mockResults = [];
      if (searchForm.intent === "Adopción") {
        mockResults = [
          { name: "Rocky (Mock Shelter)", species: "Perro", breed: "Golden Retriever", source_type: "ong_shelter", source_name: "Albergue Patitas Felices", age: "2 años", photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200", description: "Muy cariñoso, listo para adopción." }
        ];
      } else if (searchForm.intent === "Venta") {
        mockResults = [
          { name: "Kaiser (Mock Breeder)", species: "Perro", breed: "Golden Retriever", source_type: "certified_breeder", source_name: "Criadero Golden Elite", age: "3 meses", photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200", description: "Cachorro con pedigree certificado de alta calidad." }
        ];
      } else {
        mockResults = lostPets.filter(p => p.breed.toLowerCase().includes("golden") || p.species.toLowerCase().includes("perro"));
      }

      setSearchResults({
        intent: searchForm.intent,
        detected_metadata: {
          detected_species: "Perro",
          detected_breed: "Golden Retriever",
          confidence: 0.98,
          engine_version: "MockAdapter-v1.0"
        },
        results: mockResults
      });
      addNotification(`Búsqueda ejecutada usando estrategia: ${searchForm.intent} (Modo Mock).`, "success");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('intent', searchForm.intent);
      
      // If we have a file object, send it, otherwise create a blob from base64 previewUrl
      if (searchForm.file) {
        formData.append('file', searchForm.file);
      } else if (searchForm.previewUrl) {
        const blob = await (await fetch(searchForm.previewUrl)).blob();
        formData.append('file', blob, 'search-image.jpg');
      }

      const res = await fetch(`${API_BASE}/api/image-search`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        addNotification(`Búsqueda finalizada utilizando la estrategia "${searchForm.intent}".`, "success");
      }
    } catch (e) {
      alert("Error al realizar la búsqueda.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Caretaker Actions
  const handleRegisterCaretaker = async (e) => {
    e.preventDefault();
    if (!caretakerForm.id_document) {
      alert("Debe proveer un número de documento oficial (DNI/Passport) para verificación.");
      return;
    }

    const payload = {
      ...caretakerForm,
      species_accepted: caretakerForm.species_accepted.split(',').map(s => s.trim()),
      sizes_accepted: caretakerForm.sizes_accepted.split(',').map(s => s.trim()),
    };

    if (!isBackendOnline) {
      const newCaretaker = {
        _id: `mock-care-${Date.now()}`,
        ...payload,
        is_verified: false,
        ratings: [],
        average_rating: 0.0,
        role_rules: {
          max_pets: payload.role === "Cuidador Especializado" ? 10 : (payload.role === "Cuidador Profesional" ? 5 : 2),
          allow_payment: payload.role !== "Cuidador Solidario",
          requires_certification: payload.role === "Cuidador Especializado"
        }
      };
      setUnverifiedCaretakers(prev => [...prev, newCaretaker]);
      addNotification(`Cuidador ${newCaretaker.name} registrado. Pendiente de verificación de identidad.`, "info");
      alert("Registro exitoso. Tu perfil se encuentra inactivo hasta que se verifique tu DNI.");
      setCaretakerForm({
        name: '',
        email: '',
        role: 'Cuidador Solidario',
        lat: -12.0463,
        lon: -77.0427,
        species_accepted: 'Perro, Gato',
        sizes_accepted: 'pequeño, mediano',
        administers_medication: false,
        id_document: ''
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/caretakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addNotification("Caretaker registrado con éxito. Pendiente de verificar identidad (RNF 3.1)", "info");
        alert("Registro de cuidador completado. Tu perfil se activará públicamente cuando se valide tu DNI.");
        setCaretakerForm({
          name: '',
          email: '',
          role: 'Cuidador Solidario',
          lat: -12.0463,
          lon: -77.0427,
          species_accepted: 'Perro, Gato',
          sizes_accepted: 'pequeño, mediano',
          administers_medication: false,
          id_document: ''
        });
        await fetchData();
      }
    } catch (e) {
      alert("Error al registrar cuidador.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCaretaker = async (id) => {
    if (!isBackendOnline) {
      const caregiver = unverifiedCaretakers.find(c => c._id === id);
      if (caregiver) {
        caregiver.is_verified = true;
        setUnverifiedCaretakers(prev => prev.filter(c => c._id !== id));
        setCaretakers(prev => [...prev, caregiver]);
        addNotification(`[Mock] Perfil de ${caregiver.name} verificado e ID oficial validado.`, "success");
      }
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/caretakers/${id}/verify`, { method: 'POST' });
      if (res.ok) {
        addNotification("Documento de identidad verificado y perfil activado.", "success");
        alert("Perfil verificado con éxito.");
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      alert("Error al verificar cuidador.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlerts = async (caretaker, enabled) => {
    if (!isBackendOnline) {
      setCaretakers(prev => prev.map(c => {
        if (c._id === caretaker._id) {
          return { ...c, alert_notifications_enabled: enabled };
        }
        return c;
      }));
      addNotification(`[Mock] Receptor de alertas de ${caretaker.name} configurado en ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}.`, "info");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/caretakers/${caretaker._id}/toggle-alerts?enabled=${enabled}`, {
        method: 'PUT'
      });
      if (res.ok) {
        addNotification(`Toggle de alertas cambiado para ${caretaker.name} a ${enabled ? 'ON' : 'OFF'} (RF 3.3)`, "success");
        await fetchData();
      }
    } catch (e) {
      alert("Error al cambiar toggle de alertas.");
    }
  };

  const handleAddReview = async (caretakerId, e) => {
    e.preventDefault();
    if (!reviewForm.reviewer_name || !reviewForm.comment) {
      alert("Por favor rellena el nombre y comentario de la reseña.");
      return;
    }

    const payload = {
      ...reviewForm,
      verified: true
    };

    if (!isBackendOnline) {
      setCaretakers(prev => prev.map(c => {
        if (c._id === caretakerId) {
          const newRatings = [...(c.ratings || []), payload];
          const verified = newRatings.filter(r => r.verified);
          const newAvg = verified.length ? parseFloat((verified.reduce((acc, curr) => acc + curr.score, 0) / verified.length).toFixed(1)) : 0.0;
          return { ...c, ratings: newRatings, average_rating: newAvg };
        }
        return c;
      }));
      addNotification("Reseña agregada con éxito (Modo Mock). Calificación promedio recalculada.", "success");
      setReviewForm({ score: 5, comment: '', reviewer_name: '' });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/caretakers/${caretakerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addNotification("Reseña verificada registrada. Promedio recalculado (RF 3.4)", "success");
        alert("Reseña registrada con éxito.");
        setReviewForm({ score: 5, comment: '', reviewer_name: '' });
        await fetchData();
      }
    } catch (e) {
      alert("Error al registrar reseña.");
    } finally {
      setLoading(false);
    }
  };

  // Helper coordinate pickers mapping
  const handleMapClick = (e, targetForm, setForm) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left; // x coordinate within element
    const y = e.clientY - rect.top;  // y coordinate within element
    
    // Scale to visual coordinates centered around Lima (-12.0463, -77.0427)
    // Scale factors: width is 0.02 degrees lon, height is 0.02 degrees lat
    const pctX = x / rect.width;
    const pctY = y / rect.height;
    
    const lon = -77.0527 + (pctX * 0.02);
    const lat = -12.0363 - (pctY * 0.02); // lat increases upwards, so we subtract
    
    setForm(prev => ({
      ...prev,
      lat: parseFloat(lat.toFixed(6)),
      lon: parseFloat(lon.toFixed(6))
    }));
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header glass-panel" style={{ padding: '1rem 1.5rem', borderRadius: '12px' }}>
        <div className="brand">
          <div className="brand-logo">🐾</div>
          <div className="brand-text" style={{ textAlign: 'left' }}>
            <h1>PetMatch & Alert</h1>
            <p>PC4 - Desarrollo de Software | Patrones de Diseño GoF</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Estado: 
            <span style={{ 
              display: 'inline-block', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: isBackendOnline ? '#10b981' : '#ef4444',
              boxShadow: isBackendOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444'
            }}></span> 
            {isBackendOnline ? 'Conectado a MongoDB' : 'Modo Demostración Offline'}
          </span>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} onClick={handleSeed}>
            ⚡ Inicializar Semilla (MongoDB)
          </button>
        </div>
      </header>

      {/* Live Ticker Alerta */}
      <div className="live-ticker">
        <div className="ticker-pulse"></div>
        <div className="ticker-label">Última Alerta</div>
        <marquee className="ticker-content" scrollamount="4">{tickerMessage}</marquee>
      </div>

      {/* Main Layout Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div className="nav-tabs">
          <button className={`nav-tab ${tab === 'inicio' ? 'active' : ''}`} onClick={() => setTab('inicio')}>
            🏠 Resumen del Sistema
          </button>
          <button className={`nav-tab ${tab === 'perdidos' ? 'active' : ''}`} onClick={() => setTab('perdidos')}>
            🚨 Reportar Pérdida
          </button>
          <button className={`nav-tab ${tab === 'buscador' ? 'active' : ''}`} onClick={() => setTab('buscador')}>
            🔍 Buscador Inteligente
          </button>
          <button className={`nav-tab ${tab === 'cuidadores' ? 'active' : ''}`} onClick={() => setTab('cuidadores')}>
            🏡 Red de Cuidadores
          </button>
        </div>
      </div>

      {/* Content Panels */}
      {loading && <div style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontWeight: 600 }}>Cargando datos del servidor...</div>}

      {/* TAB 1: INICIO */}
      {tab === 'inicio' && (
        <div className="dashboard-grid">
          <div>
            <div className="glass-panel panel-section">
              <h2 className="panel-title">🐾 Sobre este Sistema (PC4)</h2>
              <p>
                Esta plataforma implementa un ecosistema completo para mascotas basado en <strong>6 patrones de diseño GoF</strong>, cumpliendo estrictamente con los requerimientos técnicos:
              </p>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderLeft: '3px solid var(--accent-cyan)', paddingLeft: '1rem' }}>
                  <h4 style={{ color: 'var(--accent-cyan)' }}>🧬 Patrones Creacionales</h4>
                  <p style={{ fontSize: '0.9rem', margin: '0.2rem 0' }}>
                    <strong>Singleton:</strong> Clase <code>MongoDBManager</code> en <code>db.py</code> garantiza una única conexión estable y compartida.
                  </p>
                  <p style={{ fontSize: '0.9rem', margin: '0' }}>
                    <strong>Factory Method:</strong> Clase <code>CaregiverProfileFactory</code> en <code>factory.py</code> crea perfiles (Solidario, Profesional, Especializado) con sus límites de servicio dinámicos.
                  </p>
                </div>
                
                <div style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: '1rem' }}>
                  <h4 style={{ color: 'var(--accent-primary)' }}>🏗️ Patrones Estructurales</h4>
                  <p style={{ fontSize: '0.9rem', margin: '0.2rem 0' }}>
                    <strong>Adapter:</strong> Clase <code>ImageSearchAdapter</code> en <code>adapter.py</code> estandariza los metadatos de imágenes de motores externos en formato JSON intercambiable (RNF 2.1).
                  </p>
                  <p style={{ fontSize: '0.9rem', margin: '0' }}>
                    <strong>Facade:</strong> Clase <code>AlertNotificationFacade</code> en <code>facade.py</code> simplifica el proceso de registro de mascotas, cálculo de distancias (Haversine) y despacho de alertas.
                  </p>
                </div>

                <div style={{ borderLeft: '3px solid var(--accent-secondary)', paddingLeft: '1rem' }}>
                  <h4 style={{ color: 'var(--accent-secondary)' }}>🧠 Patrones de Comportamiento</h4>
                  <p style={{ fontSize: '0.9rem', margin: '0.2rem 0' }}>
                    <strong>Observer:</strong> Clase <code>LostPetSubject</code> en <code>observer.py</code> gestiona la notificación inmediata a observadores suscritos (usuarios y cuidadores) en el radio de 1 km en paralelo (RNF 1.1 - latencia &lt; 5s).
                  </p>
                  <p style={{ fontSize: '0.9rem', margin: '0' }}>
                    <strong>Strategy:</strong> Clase <code>SearchContext</code> en <code>strategy.py</code> intercambia los filtros de búsqueda basándose en la intención (Adopción, Venta o Verificar Pérdida) seleccionada (RF 2.2).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="glass-panel panel-section" style={{ minHeight: '350px' }}>
              <h2 className="panel-title">🔔 Notificaciones Recientes</h2>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay alertas o registros nuevos.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="notification-item">
                      <div style={{ fontWeight: 600, color: n.type === 'success' ? '#4ade80' : (n.type === 'system' ? 'var(--accent-cyan)' : 'var(--text-primary)') }}>
                        {n.type === 'success' ? '⚡ Alerta Enviada' : 'ℹ️ Información'}
                      </div>
                      <div>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPORTAR MASCOTA PERDIDA */}
      {tab === 'perdidos' && (
        <div>
          <div className="glass-panel panel-section" style={{ marginBottom: '2.5rem' }}>
            <h2 className="panel-title">🚨 Registrar Reporte de Mascota Perdida</h2>
            <form onSubmit={handleCreateLostPet} className="form-grid">
              <div>
                <div className="form-group">
                  <label>Nombre de la Mascota</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Ej. Fido, Max..." 
                    value={petForm.name} 
                    onChange={e => setPetForm({...petForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Especie</label>
                  <select 
                    className="form-control" 
                    value={petForm.species} 
                    onChange={e => setPetForm({...petForm, species: e.target.value})}
                  >
                    <option value="Perro">Perro</option>
                    <option value="Gato">Gato</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Raza</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Ej. Golden Retriever, Criollo..." 
                    value={petForm.breed} 
                    onChange={e => setPetForm({...petForm, breed: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    required
                    placeholder="Detalles sobre collar, señas particulares o comportamiento..." 
                    value={petForm.description} 
                    onChange={e => setPetForm({...petForm, description: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <div className="form-group">
                  <label>Imagen de la Mascota (Subir archivo)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-control" 
                    onChange={e => handleFileChange(e, (base64) => setPetForm({...petForm, photo: base64}))}
                  />
                  {petForm.photo && (
                    <img src={petForm.photo} alt="Vista previa" style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '0.5rem', borderRadius: '8px' }} />
                  )}
                </div>
                
                <div className="form-group">
                  <label>Ubicación (Haz clic en el mapa simulado para seleccionar coordenadas)</label>
                  <div className="coord-picker" onClick={e => handleMapClick(e, petForm, setPetForm)}>
                    <div className="coord-picker-grid"></div>
                    {/* Visual dot representation */}
                    <div className="coord-picker-dot" style={{
                      left: `${((petForm.lon - (-77.0527)) / 0.02) * 100}%`,
                      top: `${(((-12.0363) - petForm.lat) / 0.02) * 100}%`
                    }}></div>
                    <span style={{ position: 'absolute', bottom: '5px', right: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Área Lima Metropolitana</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Latitud: </span>
                      <strong>{petForm.lat}</strong>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Longitud: </span>
                      <strong>{petForm.lon}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="submit" className="btn">
                    🚀 Registrar y Activar Alerta (1 km)
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div>
            <h2>🚨 Mascotas Perdidas Activas</h2>
            <p style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <strong>Nota de Seguridad (RNF 1.2):</strong> Para la protección de los dueños, se ha anonimizado su información personal de contacto. Toda la comunicación se realiza a través de avistamientos anónimos.
            </p>
            <div className="grid-container">
              {lostPets.map(p => (
                <div key={p._id} className="card">
                  <div className="card-media">
                    <img src={p.photo} alt={p.name} />
                    <span className="card-badge" style={{ backgroundColor: '#ef4444' }}>Mascota Perdida</span>
                  </div>
                  <div className="card-body">
                    <h3 className="card-title">{p.name}</h3>
                    <div className="card-subtitle">{p.species} | {p.breed}</div>
                    <p className="card-desc">{p.description}</p>
                    
                    <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem' }}>
                      📍 <strong>Lat:</strong> {p.lat} | <strong>Lon:</strong> {p.lon}
                    </div>

                    {/* Sighting list */}
                    {p.sightings && p.sightings.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>👁️ Avistamientos ({p.sightings.length}):</strong>
                        <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {p.sightings.map((s, idx) => (
                            <div key={s._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                              📍 Lat: {s.lat}, Lon: {s.lon} - <em>"{s.description}"</em>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
                        onClick={() => setSelectedPetForSighting(p)}
                      >
                        👁️ Reportar Avistamiento
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sighting Modal */}
      {selectedPetForSighting && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2 className="panel-title">👁️ Reportar Avistamiento de {selectedPetForSighting.name}</h2>
            <p>Tu reporte será guardado de forma anónima para ayudar al dueño a localizar a su mascota.</p>
            
            <form onSubmit={handleCreateSighting}>
              <div className="form-group">
                <label>Descripción / Estado de la mascota</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  required 
                  placeholder="Ej: Lo vi corriendo asustado en el parque, se ve cansado..."
                  value={sightingForm.description}
                  onChange={e => setSightingForm({...sightingForm, description: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Imagen del Avistamiento (Subir Foto)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-control"
                  onChange={e => handleFileChange(e, (base64) => setSightingForm({...sightingForm, photo: base64}))}
                />
              </div>

              <div className="form-group">
                <label>Ubicación exacta del Avistamiento (Haz clic en el mapa simulado)</label>
                <div className="coord-picker" onClick={e => handleMapClick(e, sightingForm, setSightingForm)}>
                  <div className="coord-picker-grid"></div>
                  <div className="coord-picker-dot" style={{
                    left: `${((sightingForm.lon - (-77.0527)) / 0.02) * 100}%`,
                    top: `${(((-12.0363) - sightingForm.lat) / 0.02) * 100}%`
                  }}></div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong>Lat:</strong> {sightingForm.lat}</div>
                  <div><strong>Lon:</strong> {sightingForm.lon}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedPetForSighting(null)}>Cancelar</button>
                <button type="submit" className="btn">Enviar Avistamiento Anónimo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: BUSCADOR POR IMAGEN MULTIPROPÓSITO */}
      {tab === 'buscador' && (
        <div>
          <div className="glass-panel panel-section">
            <h2 className="panel-title">🔍 Buscador Inteligente por Imagen</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Carga la foto de la mascota e indica tu intención. El sistema adaptará el motor de inteligencia artificial (Adapter) y aplicará los filtros correctos (Strategy) en tiempo récord.
            </p>

            <form onSubmit={handleImageSearchSubmit} className="form-grid">
              <div>
                <div className="form-group">
                  <label>Selecciona tu Intención (RF 2.2)</label>
                  <select 
                    className="form-control" 
                    value={searchForm.intent} 
                    onChange={e => setSearchForm({...searchForm, intent: e.target.value})}
                  >
                    <option value="Adopción">Adoptar Mascota (ONGs / Albergues)</option>
                    <option value="Venta">Comprar Mascota (Criaderos Certificados)</option>
                    <option value="Verificar Pérdida">Verificar Pérdida (Alertas Activas)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Sube una foto de la Mascota</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-control"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSearchForm({
                            ...searchForm,
                            file: file,
                            previewUrl: reader.result
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" className="btn">
                    🔍 Procesar y Buscar
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', textAlign: 'left', marginBottom: '0.5rem' }}>
                  Vista previa de la Imagen cargada
                </label>
                <div className="image-upload-area" style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {searchForm.previewUrl ? (
                    <img src={searchForm.previewUrl} alt="Vista previa de búsqueda" className="image-upload-preview" style={{ marginTop: 0 }} />
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>
                      📸 Ninguna imagen seleccionada
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div style={{ marginTop: '2.5rem' }}>
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <h3 style={{ color: 'var(--accent-cyan)' }}>🧬 Metadatos Estandarizados JSON (RNF 2.1)</h3>
                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>El <strong>Adapter</strong> procesó la imagen del motor y extrajo el siguiente formato intercambiable:</p>
                <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', color: '#4ade80', fontSize: '0.85rem', overflowX: 'auto' }}>
                  {JSON.stringify(searchResults.detected_metadata, null, 2)}
                </pre>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <strong>Estrategia Aplicada (Strategy):</strong> Filtrado exclusivo en base a <em>{searchResults.intent}</em>.
                </div>
              </div>

              <h2>📦 Resultados encontrados ({searchResults.results.length})</h2>
              {searchResults.results.length === 0 ? (
                <p>No se encontraron coincidencias para la especie y raza de la imagen con la intención seleccionada.</p>
              ) : (
                <div className="grid-container">
                  {searchResults.results.map((p, idx) => (
                    <div key={p._id || idx} className="card">
                      <div className="card-media">
                        <img src={p.photo} alt={p.name} />
                        <span className="card-badge" style={{ backgroundColor: p.source_type === 'ong_shelter' ? '#3b82f6' : (p.source_type === 'certified_breeder' ? '#a855f7' : '#ef4444') }}>
                          {p.source_type === 'ong_shelter' ? 'Adopción' : (p.source_type === 'certified_breeder' ? 'Venta Certificada' : 'Alerta Perdido')}
                        </span>
                      </div>
                      <div className="card-body">
                        <h3 className="card-title">{p.name || 'Sin Nombre'}</h3>
                        <div className="card-subtitle">{p.species} | {p.breed}</div>
                        <p className="card-desc">{p.description}</p>
                        <div className="card-meta">
                          <span>
                            {p.source_name || (p.status === 'lost' ? 'Alerta de Mascota' : 'Protectora')}
                          </span>
                          <span>{p.age || ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RED DE CUIDADORES */}
      {tab === 'cuidadores' && (
        <div className="dashboard-grid">
          <div>
            {/* Caretakers register */}
            <div className="glass-panel panel-section" style={{ marginBottom: '2rem' }}>
              <h2 className="panel-title">📝 Registrarse como Cuidador</h2>
              <form onSubmit={handleRegisterCaretaker} className="form-grid">
                <div>
                  <div className="form-group">
                    <label>Nombre Completo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="Ej: Juan Perez"
                      value={caretakerForm.name}
                      onChange={e => setCaretakerForm({...caretakerForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      required 
                      placeholder="juan@email.com"
                      value={caretakerForm.email}
                      onChange={e => setCaretakerForm({...caretakerForm, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rol de Cuidador (RF 3.1 & Factory)</label>
                    <select 
                      className="form-control"
                      value={caretakerForm.role}
                      onChange={e => setCaretakerForm({...caretakerForm, role: e.target.value})}
                    >
                      <option value="Cuidador Solidario">Cuidador Solidario</option>
                      <option value="Cuidador Profesional">Cuidador Profesional</option>
                      <option value="Cuidador Especializado">Cuidador Especializado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Documento de Identidad Oficial (DNI/CEX) (RNF 3.1)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="Ingresa tu documento oficial..."
                      value={caretakerForm.id_document}
                      onChange={e => setCaretakerForm({...caretakerForm, id_document: e.target.value})}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>El perfil no se habilitará hasta validar este documento en el panel administrador.</span>
                  </div>
                </div>

                <div>
                  <div className="form-group">
                    <label>Especies Aceptadas (Separadas por comas)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Perro, Gato"
                      value={caretakerForm.species_accepted}
                      onChange={e => setCaretakerForm({...caretakerForm, species_accepted: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tamaños Aceptados (Separados por comas)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="pequeño, mediano"
                      value={caretakerForm.sizes_accepted}
                      onChange={e => setCaretakerForm({...caretakerForm, sizes_accepted: e.target.value})}
                    />
                  </div>
                  <div className="switch-container" style={{ margin: '0.5rem 0' }}>
                    <span>¿Administra Medicamentos? (RF 3.2)</span>
                    <label className="switch">
                      <input 
                        type="checkbox"
                        checked={caretakerForm.administers_medication}
                        onChange={e => setCaretakerForm({...caretakerForm, administers_medication: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label>Ubicación de servicio (Clic en mapa)</label>
                    <div className="coord-picker" onClick={e => handleMapClick(e, caretakerForm, setCaretakerForm)}>
                      <div className="coord-picker-grid"></div>
                      <div className="coord-picker-dot" style={{
                        left: `${((caretakerForm.lon - (-77.0527)) / 0.02) * 100}%`,
                        top: `${(((-12.0363) - caretakerForm.lat) / 0.02) * 100}%`
                      }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="btn">Registrarse</button>
                  </div>
                </div>
              </form>
            </div>

            {/* Public Caretakers List */}
            <h2>🏡 Red de Cuidadores Verificados</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
              {caretakers.length === 0 ? (
                <p>No hay cuidadores verificados disponibles. Puedes registrarte y verificar tu identidad.</p>
              ) : (
                caretakers.map(c => (
                  <div key={c._id} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0 }}>{c.name}</h3>
                        <span className={`role-badge ${c.role.includes('Solidario') ? 'role-solidario' : (c.role.includes('Profesional') ? 'role-profesional' : 'role-especializado')}`}>
                          {c.role}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <span className="rating-badge">★ {c.average_rating || 'N/A'}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          ({c.ratings ? c.ratings.length : 0} reseñas)
                        </span>
                      </div>

                      <div className="detail-list">
                        <div className="detail-item">
                          <span>Email:</span>
                          <span>{c.email}</span>
                        </div>
                        <div className="detail-item">
                          <span>Especies:</span>
                          <span>{c.species_accepted.join(', ')}</span>
                        </div>
                        <div className="detail-item">
                          <span>Tamaños:</span>
                          <span>{c.sizes_accepted.join(', ')}</span>
                        </div>
                        <div className="detail-item">
                          <span>¿Da Medicinas?:</span>
                          <span>{c.administers_medication ? 'Sí' : 'No'}</span>
                        </div>
                      </div>

                      {/* Rule Rules (Factory) */}
                      {c.role_rules && (
                        <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          🔑 <strong>Reglas del Rol (Factory):</strong> Max mascotas: {c.role_rules.max_pets} | Cobro: {c.role_rules.allow_payment ? 'Permitido' : 'Gratuito/Solidario'}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {/* Toggle alerts receiver */}
                      <div className="switch-container">
                        <span style={{ fontSize: '0.85rem' }}>🔔 Recibir alertas geográficas (RF 3.3)</span>
                        <label className="switch">
                          <input 
                            type="checkbox"
                            checked={c.alert_notifications_enabled}
                            onChange={e => handleToggleAlerts(c, e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>

                      {/* Add Review */}
                      <div className="reviews-container">
                        <strong style={{ fontSize: '0.85rem' }}>Escribir Reseña (RF 3.4)</strong>
                        <form onSubmit={(e) => handleAddReview(c._id, e)} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <input 
                            type="text" 
                            placeholder="Tu nombre" 
                            className="form-control"
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                            required
                            value={reviewForm.reviewer_name}
                            onChange={e => setReviewForm({...reviewForm, reviewer_name: e.target.value})}
                          />
                          <select 
                            className="form-control" 
                            style={{ width: '60px', padding: '0.4rem', fontSize: '0.8rem' }}
                            value={reviewForm.score}
                            onChange={e => setReviewForm({...reviewForm, score: parseInt(e.target.value)})}
                          >
                            <option value="5">5★</option>
                            <option value="4">4★</option>
                            <option value="3">3★</option>
                            <option value="2">2★</option>
                            <option value="1">1★</option>
                          </select>
                          <input 
                            type="text" 
                            placeholder="Comentario" 
                            className="form-control"
                            style={{ flex: 2, padding: '0.4rem', fontSize: '0.8rem' }}
                            required
                            value={reviewForm.comment}
                            onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                          />
                          <button type="submit" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Enviar</button>
                        </form>

                        {/* Ratings display list */}
                        {c.ratings && c.ratings.length > 0 && (
                          <div style={{ marginTop: '0.75rem', maxHeight: '100px', overflowY: 'auto' }}>
                            {c.ratings.map((r, idx) => (
                              <div key={idx} className="review-item">
                                <div className="review-header">
                                  <span>{r.reviewer_name}</span>
                                  <span>{r.score}★</span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>"{r.comment}"</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Admin Verification Sidebar */}
          <div>
            <div className="glass-panel panel-section">
              <h2 className="panel-title" style={{ color: 'var(--accent-secondary)' }}>🛡️ Panel de Validación (RNF 3.1)</h2>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Antes de habilitar a un cuidador de manera pública en la plataforma, un administrador debe verificar la validez de su documento de identidad oficial.
              </p>

              {unverifiedCaretakers.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay cuidadores pendientes de validación en este momento.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {unverifiedCaretakers.map(c => (
                    <div key={c._id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(232, 121, 249, 0.15)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>{c.name}</strong>
                        <span style={{ color: 'var(--accent-secondary)' }}>{c.role}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        📇 <strong>ID Documento:</strong> {c.id_document || 'Ninguno'}
                      </div>
                      <button 
                        className="btn" 
                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => handleVerifyCaretaker(c._id)}
                      >
                        ✓ Validar Documento y Habilitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
