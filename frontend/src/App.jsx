import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Default Icon paths using CDN URLs to avoid bundler issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_BASE = 'http://localhost:8000';

// Fallback data when backend is offline
const MOCK_PETS = [
  {
    _id: "mock-pet-1",
    name: "Fido (Demo)",
    species: "Perro",
    breed: "Golden Retriever",
    description: "Perro dócil con collar rojo. Se extravió cerca a la plaza principal.",
    lat: -12.0463,
    lon: -77.0427,
    photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400",
    status: "lost",
    sightings: []
  }
];

const MOCK_CARETAKERS = [
  {
    _id: "mock-care-1",
    name: "Carlos Gomez (Demo)",
    email: "carlos.solidario@gmail.com",
    role: "Cuidador Solidario",
    lat: -12.0470,
    lon: -77.0430,
    species_accepted: ["Perro", "Gato"],
    sizes_accepted: ["pequeño", "mediano"],
    administers_medication: false,
    is_verified: true,
    alert_notifications_enabled: true,
    ratings: [{"score": 5, "comment": "Excelente trato, muy puntual.", "verified": true}],
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
    name: "Ana Perez (Veterinaria Demo)",
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
      {"score": 5, "comment": "Muy profesional e instruida.", "verified": true},
      {"score": 4, "comment": "Buen trato con cachorros.", "verified": true}
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

// Leaflet Map Selector Component for forms
function LeafletMapSelector({ lat, lon, onChange }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map centered at current coordinates
    const map = L.map(mapRef.current).setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstance.current = map;

    // Add draggable marker
    const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Listen to drag events
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
    });

    // Listen to map click events
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onChange(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update marker position if coordinates change externally
  useEffect(() => {
    if (markerRef.current && mapInstance.current) {
      const currentPos = markerRef.current.getLatLng();
      if (currentPos.lat !== lat || currentPos.lng !== lon) {
        markerRef.current.setLatLng([lat, lon]);
        mapInstance.current.setView([lat, lon]);
      }
    }
  }, [lat, lon]);

  return <div ref={mapRef} className="map-container" />;
}

// Leaflet Read-only Map displaying all active alerts
function LeafletAlertsMap({ pets }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current || pets.length === 0) return;

    const centerLat = pets[0].lat;
    const centerLon = pets[0].lon;

    const map = L.map(mapRef.current).setView([centerLat, centerLon], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstance.current = map;

    // Add markers
    pets.forEach(p => {
      const marker = L.marker([p.lat, p.lon])
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 0.85rem; text-align: left;">
            <strong style="font-size: 1rem; color: #008060;">${p.name}</strong><br/>
            <b>Raza:</b> ${p.breed}<br/>
            <b>Descripción:</b> ${p.description}
          </div>
        `);
      markersRef.current.push(marker);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      markersRef.current = [];
    };
  }, [pets]);

  return <div ref={mapRef} className="map-container" style={{ height: '300px', marginBottom: '1.5rem' }} />;
}

export default function App() {
  const [tab, setTab] = useState('perdidos'); // Default tab is perdidos
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickerMessage, setTickerMessage] = useState('Buscando reportes activos de mascotas perdidas...');

  // Data States
  const [lostPets, setLostPets] = useState([]);
  const [caretakers, setCaretakers] = useState([]);
  const [unverifiedCaretakers, setUnverifiedCaretakers] = useState([]);
  const [searchResults, setSearchResults] = useState(null);

  // Sighting modal target
  const [selectedPetForSighting, setSelectedPetForSighting] = useState(null);

  // Form States - Lost Pet (Centered in Lima: -12.046374, -77.042793)
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

  // Check connection and load data
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
    } catch {
      loadMockData();
    }
  };

  const loadMockData = () => {
    setIsBackendOnline(false);
    setLostPets(MOCK_PETS);
    setCaretakers(MOCK_CARETAKERS);
    setTickerMessage('Modo demostración local: Mostrando mascotas de prueba en el mapa.');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const petsRes = await fetch(`${API_BASE}/api/lost-pets`);
      const petsData = await petsRes.json();
      setLostPets(petsData);

      if (petsData.length > 0) {
        const latest = petsData[petsData.length - 1];
        setTickerMessage(`🚨 ÚLTIMA ALERTA: ${latest.name} (${latest.breed}) reportado como perdido cerca de lat: ${latest.lat}, lon: ${latest.lon}`);
      } else {
        setTickerMessage('No hay alertas activas de mascotas perdidas en el área.');
      }

      const careRes = await fetch(`${API_BASE}/api/caretakers`);
      const careData = await careRes.json();
      setCaretakers(careData.filter(c => c.is_verified));
      setUnverifiedCaretakers(careData.filter(c => !c.is_verified));
      
      setIsBackendOnline(true);
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!isBackendOnline) {
      alert("No se pudo establecer conexión con el backend de FastAPI. Asegúrate de encender el backend y configurar tu MONGODB_URI.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/seed`, { method: 'POST' });
      if (res.ok) {
        alert("¡Base de datos MongoDB inicializada con datos semilla exitosamente!");
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      alert("Error al inicializar la base de datos.");
    } finally {
      setLoading(false);
    }
  };

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

  // 1. Register Lost Pet
  const handleCreateLostPet = async (e) => {
    e.preventDefault();
    if (!petForm.photo) {
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
      setTickerMessage(`🚨 ÚLTIMA ALERTA: ${newPet.name} (${newPet.breed}) reportado en lat: ${newPet.lat}, lon: ${newPet.lon}`);
      alert("Mascota reportada con éxito (Modo simulación local).");
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
        await res.json();
        alert(`Mascota registrada con éxito. Notificaciones enviadas a vecinos.`);
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
      console.error(e);
      alert("Error al reportar mascota.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Anonymous Sighting
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
      setLostPets(prev => prev.map(p => {
        if (p._id === selectedPetForSighting._id) {
          return {
            ...p,
            sightings: [...(p.sightings || []), { _id: `mock-sight-${Date.now()}`, ...sightingForm }]
          };
        }
        return p;
      }));
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
        alert("Avistamiento reportado con éxito. Gracias por tu ayuda.");
        setSightingForm({ lat: -12.0463, lon: -77.0427, photo: '', description: '' });
        setSelectedPetForSighting(null);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      alert("Error al registrar avistamiento.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Image Search
  const handleImageSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchForm.file && !searchForm.previewUrl) {
      alert("Por favor selecciona una imagen para realizar la búsqueda.");
      return;
    }

    if (!isBackendOnline) {
      let mockResults = [];
      if (searchForm.intent === "Adopción") {
        mockResults = [
          { name: "Rocky (Refugio)", species: "Perro", breed: "Golden Retriever", source_type: "ong_shelter", source_name: "Albergue Patitas Felices", age: "2 años", photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200", description: "Cariñoso, le encanta correr." }
        ];
      } else if (searchForm.intent === "Venta") {
        mockResults = [
          { name: "Kaiser (Criadero)", species: "Perro", breed: "Golden Retriever", source_type: "certified_breeder", source_name: "Criadero Golden Elite", age: "3 meses", photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200", description: "Pedigree oficial, vacunas completas." }
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
          engine_version: "Adapter-v1.0"
        },
        results: mockResults
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('intent', searchForm.intent);
      
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
      }
    } catch (e) {
      console.error(e);
      alert("Error al realizar la búsqueda.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Caretakers
  const handleRegisterCaretaker = async (e) => {
    e.preventDefault();
    if (!caretakerForm.id_document) {
      alert("Debe ingresar un número de documento para la verificación oficial.");
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
      alert("Registro de cuidador completado. Tu perfil se activará cuando se verifique tu identidad.");
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
        alert("Registro completado. Tu perfil se habilitará públicamente tras verificar tu DNI.");
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
      console.error(e);
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
      }
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/caretakers/${id}/verify`, { method: 'POST' });
      if (res.ok) {
        alert("Perfil verificado con éxito.");
        await fetchData();
      }
    } catch (e) {
      console.error(e);
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
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/caretakers/${caretaker._id}/toggle-alerts?enabled=${enabled}`, {
        method: 'PUT'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReview = async (caretakerId, e) => {
    e.preventDefault();
    if (!reviewForm.reviewer_name || !reviewForm.comment) {
      alert("Por favor rellena el nombre y comentario.");
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
        setReviewForm({ score: 5, comment: '', reviewer_name: '' });
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      alert("Error al registrar reseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">🐕</div>
          <div className="brand-text" style={{ textAlign: 'left' }}>
            <h1>PetMatch & Alert</h1>
            <p>Red de Búsqueda y Cuidado de Mascotas</p>
          </div>
        </div>
        <div className="nav-tabs">
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
      </header>

      {/* Ticker de Alertas de Mascotas Perdidas */}
      <div className="live-ticker">
        <div className="ticker-pulse"></div>
        <div className="ticker-label">Última Alerta</div>
        <marquee className="ticker-content" scrollamount="3">{tickerMessage}</marquee>
      </div>

      {loading && <div style={{ color: 'var(--accent-primary)', marginBottom: '1.25rem', fontWeight: 600 }}>Procesando...</div>}

      {/* TAB 1: REPORTAR MASCOTA PERDIDA */}
      {tab === 'perdidos' && (
        <div>
          {/* Active alerts Map */}
          {lostPets.length > 0 && (
            <div className="glass-panel panel-section" style={{ marginBottom: '2rem' }}>
              <h2 className="panel-title">🗺️ Mapa de Búsqueda Activa</h2>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                Halla aquí las alertas activas en tu vecindario. Los datos de contacto del dueño están protegidos.
              </p>
              <LeafletAlertsMap pets={lostPets} />
            </div>
          )}

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
                    placeholder="Ej. Golden Retriever..." 
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
                    placeholder="Detalles señas particulares, color, collar..." 
                    value={petForm.description} 
                    onChange={e => setPetForm({...petForm, description: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <div className="form-group">
                  <label>Fotografía de la Mascota</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-control" 
                    onChange={e => handleFileChange(e, (base64) => setPetForm({...petForm, photo: base64}))}
                  />
                  {petForm.photo && (
                    <img src={petForm.photo} alt="Vista previa" style={{ width: '80px', height: '80px', objectFit: 'cover', marginTop: '0.5rem', borderRadius: '6px' }} />
                  )}
                </div>
                
                <div className="form-group">
                  <label>Seleccionar Ubicación en el Mapa (Arrastra el marcador)</label>
                  <LeafletMapSelector 
                    lat={petForm.lat} 
                    lon={petForm.lon} 
                    onChange={(lat, lon) => setPetForm(prev => ({ ...prev, lat, lon }))}
                  />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>Lat: <b>{petForm.lat}</b></div>
                    <div>Lon: <b>{petForm.lon}</b></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="submit" className="btn">
                    Activar Alerta Geográfica (1 km)
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div>
            <h2>🚨 Listado de Mascotas Perdidas</h2>
            <div className="grid-container">
              {lostPets.map(p => (
                <div key={p._id} className="card">
                  <div className="card-media">
                    <img src={p.photo} alt={p.name} />
                    <span className="card-badge" style={{ borderColor: 'var(--accent-coral)', color: 'var(--accent-coral)' }}>Mascota Perdida</span>
                  </div>
                  <div className="card-body">
                    <h3 className="card-title">{p.name}</h3>
                    <div className="card-subtitle">{p.species} | {p.breed}</div>
                    <p className="card-desc">{p.description}</p>
                    
                    <div style={{ fontSize: '0.8rem', background: 'var(--bg-tertiary)', padding: '0.4rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                      📍 Ubicación: <b>{p.lat}</b>, <b>{p.lon}</b>
                    </div>

                    {/* Sighting list */}
                    {p.sightings && p.sightings.length > 0 && (
                      <div style={{ marginBottom: '0.75rem', textAlign: 'left' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>👁️ Avistamientos ({p.sightings.length}):</strong>
                        <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {p.sightings.map((s, idx) => (
                            <div key={s._id || idx} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.2rem', marginBottom: '0.2rem' }}>
                              📍 Lat: {s.lat}, Lon: {s.lon} - <em>"{s.description}"</em>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}
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
            <h2 className="panel-title">👁️ Reportar Avistamiento: {selectedPetForSighting.name}</h2>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Sube la foto y marca en el mapa dónde viste a la mascota.</p>
            
            <form onSubmit={handleCreateSighting}>
              <div className="form-group">
                <label>Descripción / Observación</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  required 
                  placeholder="Ej: Lo vi tomando agua en el parque..."
                  value={sightingForm.description}
                  onChange={e => setSightingForm({...sightingForm, description: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Foto de Referencia</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-control"
                  onChange={e => handleFileChange(e, (base64) => setSightingForm({...sightingForm, photo: base64}))}
                />
              </div>

              <div className="form-group">
                <label>Ubicación del avistamiento (Arrastra el marcador)</label>
                <LeafletMapSelector 
                  lat={sightingForm.lat} 
                  lon={sightingForm.lon} 
                  onChange={(lat, lon) => setSightingForm(prev => ({ ...prev, lat, lon }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedPetForSighting(null)}>Cancelar</button>
                <button type="submit" className="btn">Enviar Avistamiento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: BUSCADOR POR IMAGEN MULTIPROPÓSITO */}
      {tab === 'buscador' && (
        <div>
          <div className="glass-panel panel-section">
            <h2 className="panel-title">🔍 Buscador Inteligente por Imagen</h2>
            <p style={{ marginBottom: '1.25rem' }}>
              Sube la foto de la mascota para iniciar una búsqueda inteligente según tu propósito.
            </p>

            <form onSubmit={handleImageSearchSubmit} className="form-grid">
              <div>
                <div className="form-group">
                  <label>Selecciona tu Propósito</label>
                  <select 
                    className="form-control" 
                    value={searchForm.intent} 
                    onChange={e => setSearchForm({...searchForm, intent: e.target.value})}
                  >
                    <option value="Adopción">Adoptar (Buscar en ONGs / Albergues)</option>
                    <option value="Venta">Comprar (Buscar en Criaderos Certificados)</option>
                    <option value="Verificar Pérdida">Verificar Pérdida (Comparar con Alertas Activas)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Imagen de Referencia</label>
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
                    Procesar y Buscar
                  </button>
                </div>
              </div>

              <div>
                <div className="image-upload-area" style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {searchForm.previewUrl ? (
                    <img src={searchForm.previewUrl} alt="Búsqueda" className="image-upload-preview" style={{ marginTop: 0 }} />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      📸 Arrastra o selecciona una fotografía
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div style={{ marginTop: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem', textAlign: 'left', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--accent-primary)' }}>Resultado del Análisis:</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  • Especie Detectada: <b>{searchResults.detected_metadata.detected_species}</b><br/>
                  • Raza Detectada: <b>{searchResults.detected_metadata.detected_breed}</b><br/>
                  • Precisión: <b>{(searchResults.detected_metadata.confidence * 100).toFixed(0)}%</b>
                </div>
              </div>

              <h2>📦 Resultados Encontrados ({searchResults.results.length})</h2>
              {searchResults.results.length === 0 ? (
                <p>No se encontraron resultados para los filtros indicados.</p>
              ) : (
                <div className="grid-container">
                  {searchResults.results.map((p, idx) => (
                    <div key={p._id || idx} className="card">
                      <div className="card-media">
                        <img src={p.photo} alt={p.name} />
                        <span className="card-badge" style={{ 
                          borderColor: p.source_type === 'ong_shelter' ? '#2563eb' : (p.source_type === 'certified_breeder' ? '#9333ea' : 'var(--accent-coral)'),
                          color: p.source_type === 'ong_shelter' ? '#2563eb' : (p.source_type === 'certified_breeder' ? '#9333ea' : 'var(--accent-coral)')
                        }}>
                          {p.source_type === 'ong_shelter' ? 'Albergue' : (p.source_type === 'certified_breeder' ? 'Criadero' : 'Perdido')}
                        </span>
                      </div>
                      <div className="card-body">
                        <h3 className="card-title">{p.name || 'Mascota'}</h3>
                        <div className="card-subtitle">{p.species} | {p.breed}</div>
                        <p className="card-desc">{p.description}</p>
                        <div className="card-meta">
                          <span>{p.source_name || (p.status === 'lost' ? 'Alerta Activa' : 'Protectora')}</span>
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

      {/* TAB 3: CUIDADORES */}
      {tab === 'cuidadores' && (
        <div className="dashboard-grid">
          <div>
            {/* Create Caretaker */}
            <div className="glass-panel panel-section" style={{ marginBottom: '1.5rem' }}>
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
                    <label>Rol de Servicio</label>
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
                    <label>Documento de Identidad (DNI) (RNF 3.1)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="Ingresa tu DNI oficial..."
                      value={caretakerForm.id_document}
                      onChange={e => setCaretakerForm({...caretakerForm, id_document: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <div className="form-group">
                    <label>Especies Aceptadas</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Perro, Gato"
                      value={caretakerForm.species_accepted}
                      onChange={e => setCaretakerForm({...caretakerForm, species_accepted: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tamaños Aceptados</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="pequeño, mediano"
                      value={caretakerForm.sizes_accepted}
                      onChange={e => setCaretakerForm({...caretakerForm, sizes_accepted: e.target.value})}
                    />
                  </div>
                  <div className="switch-container" style={{ margin: '0.4rem 0' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Administra medicamentos</span>
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
                    <label>Ubicación de servicio (Arrastra el marcador)</label>
                    <LeafletMapSelector 
                      lat={caretakerForm.lat} 
                      lon={caretakerForm.lon} 
                      onChange={(lat, lon) => setCaretakerForm(prev => ({ ...prev, lat, lon }))}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="btn">Registrarse como Cuidador</button>
                  </div>
                </div>
              </form>
            </div>

            {/* Verified Caretakers */}
            <h2>🏡 Directorio de Cuidadores Verificados</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {caretakers.length === 0 ? (
                <p>No hay cuidadores verificados registrados.</p>
              ) : (
                caretakers.map(c => (
                  <div key={c._id} className="glass-panel" style={{ padding: '1.25rem', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{c.name}</h3>
                        <span className={`role-badge ${c.role.includes('Solidario') ? 'role-solidario' : (c.role.includes('Profesional') ? 'role-profesional' : 'role-especializado')}`}>
                          {c.role}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span className="rating-badge">★ {c.average_rating || '0.0'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
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
                          <span>¿Administra Medicinas?:</span>
                          <span>{c.administers_medication ? 'Sí' : 'No'}</span>
                        </div>
                      </div>

                      {c.role_rules && (
                        <div style={{ marginTop: '0.75rem', background: 'var(--bg-primary)', padding: '0.4rem', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                          🔑 <b>Reglas:</b> Límite: {c.role_rules.max_pets} mascotas | Pago: {c.role_rules.allow_payment ? 'Permitido' : 'Gratuito'}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div className="switch-container">
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>🔔 Alertas Geográficas (Mascotas Perdidas)</span>
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
                        <strong style={{ fontSize: '0.8rem' }}>Agregar Calificación</strong>
                        <form onSubmit={(e) => handleAddReview(c._id, e)} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                          <input 
                            type="text" 
                            placeholder="Tu nombre" 
                            className="form-control"
                            style={{ flex: 1, padding: '0.35rem', fontSize: '0.75rem' }}
                            required
                            value={reviewForm.reviewer_name}
                            onChange={e => setReviewForm({...reviewForm, reviewer_name: e.target.value})}
                          />
                          <select 
                            className="form-control" 
                            style={{ width: '55px', padding: '0.35rem', fontSize: '0.75rem' }}
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
                            style={{ flex: 1.5, padding: '0.35rem', fontSize: '0.75rem' }}
                            required
                            value={reviewForm.comment}
                            onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                          />
                          <button type="submit" className="btn" style={{ padding: '0.35rem 0.60rem', fontSize: '0.75rem' }}>Añadir</button>
                        </form>

                        {c.ratings && c.ratings.length > 0 && (
                          <div style={{ marginTop: '0.5rem', maxHeight: '80px', overflowY: 'auto' }}>
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

          {/* Validation Sidebar */}
          <div>
            <div className="glass-panel panel-section">
              <h2 className="panel-title" style={{ color: 'var(--accent-primary)' }}>🛡️ Verificación de Cuidadores (RNF 3.1)</h2>
              <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Antes de activar un perfil de cuidador de manera pública, valida la autenticidad de su DNI.
              </p>

              {unverifiedCaretakers.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No hay perfiles pendientes.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {unverifiedCaretakers.map(c => (
                    <div key={c._id} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong>{c.name}</strong>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{c.role}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        DNI: <b>{c.id_document || 'No especificado'}</b>
                      </div>
                      <button 
                        className="btn" 
                        style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem' }}
                        onClick={() => handleVerifyCaretaker(c._id)}
                      >
                        ✓ Validar DNI y Habilitar Perfil
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discreet Footer */}
      <footer className="discreet-footer">
        <div>© 2026 PetMatch & Alert. Todos los derechos reservados.</div>
        <div>
          <button className="btn-link-seed" onClick={handleSeed}>
            Cargar Datos de Semilla (MongoDB)
          </button>
        </div>
      </footer>
    </div>
  );
}
