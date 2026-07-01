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

// Fallback data when MySQL is offline
const MOCK_PETS = [
  {
    id: 1,
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
    id: 1,
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
    id: 2,
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

    const map = L.map(mapRef.current).setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstance.current = map;

    const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
    });

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

    pets.forEach(p => {
      const marker = L.marker([p.lat, p.lon])
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 0.85rem; text-align: left;">
            <strong style="font-size: 1rem; color: #00684a;">${p.name}</strong><br/>
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

// Custom leaf & paw combination icon SVG
function CustomLogoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Leaf backdrop in MongoDB Green */}
      <path d="M16 2C16 2 25 8 25 16C25 24 16 30 16 30C16 30 7 24 7 16C7 8 16 2 16 2Z" fill="#00ed64" opacity="0.85"/>
      {/* Dog paw print inside leaf */}
      <circle cx="16" cy="18" r="4.5" fill="#00684a" />
      <circle cx="10.5" cy="13.5" r="2" fill="#00684a" />
      <circle cx="14" cy="10.5" r="2" fill="#00684a" />
      <circle cx="18" cy="10.5" r="2" fill="#00684a" />
      <circle cx="21.5" cy="13.5" r="2" fill="#00684a" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState('lost_pets');
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickerMessage, setTickerMessage] = useState('Buscando alertas de mascotas perdidas...');

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(null); // null = Connection screen first
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Connection Form (Login) States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginRole, setLoginRole] = useState('Dueño'); // 'Dueño' o 'Cuidador'
  const [loginDNI, setLoginDNI] = useState('');

  // Data States
  const [lostPets, setLostPets] = useState([]);
  const [caretakers, setCaretakers] = useState([]);
  const [unverifiedCaretakers, setUnverifiedCaretakers] = useState([]);
  const [searchResults, setSearchResults] = useState(null);

  // Sighting modal target
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
    owner_id: ''
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
    setTickerMessage('Modo simulación: Conecta tu base de datos de MySQL en backend/.env.');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const petsRes = await fetch(`${API_BASE}/api/lost-pets`);
      const petsData = await petsRes.json();
      setLostPets(petsData);

      if (petsData.length > 0) {
        const latest = petsData[petsData.length - 1];
        setTickerMessage(`🚨 ÚLTIMA ALERTA: ${latest.name} (${latest.breed}) reportado en lat: ${latest.lat}, lon: ${latest.lon}`);
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
      alert("No hay conexión con el backend. Modifica backend/.env con tu enlace de conexión MYSQL_URI y corre 'python run.py'");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/seed`, { method: 'POST' });
      if (res.ok) {
        alert("¡Base de datos MySQL inicializada con datos semilla con éxito!");
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      alert("Error al inicializar la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginEmail) return;

    const user = {
      email: loginEmail,
      role: loginRole,
      id: loginRole === 'Dueño' ? 'user_' + Date.now().toString().slice(-4) : 'care_' + Date.now().toString().slice(-4),
      dni: loginDNI
    };
    
    if (loginRole === 'Cuidador') {
      const existing = caretakers.find(c => c.email.toLowerCase() === loginEmail.toLowerCase());
      if (existing) {
        user.id = existing.id || existing._id;
        user.name = existing.name;
      }
    }

    setCurrentUser(user);
    setIsAnonymous(false);
  };

  const handleEnterAnonymous = () => {
    setCurrentUser(null);
    setIsAnonymous(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAnonymous(false);
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
    if (!currentUser) {
      alert("Debe iniciar sesión como 'Dueño' para registrar el reporte.");
      return;
    }

    if (!petForm.photo) {
      petForm.photo = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400";
    }

    const payload = {
      ...petForm,
      owner_id: currentUser.id
    };

    if (!isBackendOnline) {
      const newPet = {
        id: Date.now(),
        ...payload,
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
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(`Mascota registrada con éxito. Notificaciones enviadas.`);
        setPetForm({
          name: '',
          species: 'Perro',
          breed: '',
          description: '',
          lat: -12.0463,
          lon: -77.0427,
          photo: '',
          owner_id: ''
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
    const petId = selectedPetForSighting.id || selectedPetForSighting._id;
    const payload = {
      lost_pet_id: petId,
      ...sightingForm
    };

    if (!isBackendOnline) {
      setLostPets(prev => prev.map(p => {
        if ((p.id || p._id) === petId) {
          return {
            ...p,
            sightings: [...(p.sightings || []), { id: Date.now(), ...sightingForm }]
          };
        }
        return p;
      }));
      alert("Avistamiento reportado de forma anónima.");
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
        alert("Avistamiento reportado con éxito.");
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
      alert("Por favor selecciona una imagen.");
      return;
    }

    if (!isBackendOnline) {
      let mockResults = [];
      if (searchForm.intent === "Adopción") {
        mockResults = [
          { id: 101, name: "Rocky (Refugio)", species: "Perro", breed: "Golden Retriever", source_type: "ong_shelter", source_name: "Albergue Patitas Felices", age: "2 años", photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200", description: "Cariñoso, listo para adoptar." }
        ];
      } else if (searchForm.intent === "Venta") {
        mockResults = [
          { id: 102, name: "Kaiser (Criadero)", species: "Perro", breed: "Golden Retriever", source_type: "certified_breeder", source_name: "Criadero Golden Elite", age: "3 meses", photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200", description: "Pedigree certificado y vacunas al día." }
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
      alert("Debe ingresar un número de DNI para verificar identidad (RNF 3.1).");
      return;
    }

    const payload = {
      ...caretakerForm,
      species_accepted: caretakerForm.species_accepted.split(',').map(s => s.trim()),
      sizes_accepted: caretakerForm.sizes_accepted.split(',').map(s => s.trim()),
    };

    if (!isBackendOnline) {
      const newCaretaker = {
        id: Date.now(),
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
      alert("Registro completado. Tu perfil se activará tras validar tu DNI.");
      
      setCurrentUser({
        email: payload.email,
        role: 'Cuidador',
        id: newCaretaker.id,
        name: payload.name
      });

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
        alert("Registro completado. Tu perfil se habilitará tras validar tu DNI.");
        
        setCurrentUser({
          email: payload.email,
          role: 'Cuidador',
          id: 'temp_id',
          name: payload.name
        });

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
      alert(e.message || "Error al registrar cuidador.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCaretaker = async (id) => {
    if (!isBackendOnline) {
      const caregiver = unverifiedCaretakers.find(c => (c.id || c._id) === id);
      if (caregiver) {
        caregiver.is_verified = true;
        setUnverifiedCaretakers(prev => prev.filter(c => (c.id || c._id) !== id));
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
    const caretakerId = caretaker.id || caretaker._id;
    if (!isBackendOnline) {
      setCaretakers(prev => prev.map(c => {
        if ((c.id || c._id) === caretakerId) {
          return { ...c, alert_notifications_enabled: enabled };
        }
        return c;
      }));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/caretakers/${caretakerId}/toggle-alerts?enabled=${enabled}`, {
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
        if ((c.id || c._id) === caretakerId) {
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

  const loggedCaretaker = currentUser && currentUser.role === 'Cuidador' 
    ? caretakers.find(c => c.email.toLowerCase() === currentUser.email.toLowerCase()) || 
      unverifiedCaretakers.find(c => c.email.toLowerCase() === currentUser.email.toLowerCase())
    : null;

  // LANDING / MONGODB WEBSITE DESIGN STYLE LOGIN SCREEN
  if (!currentUser && !isAnonymous) {
    return (
      <div className="app-container" style={{ justifyContent: 'center' }}>
        <div className="landing-container">
          <div className="landing-left">
            <div className="brand" style={{ marginBottom: '0.5rem' }}>
              <CustomLogoIcon size={36} />
              <h1 style={{ color: 'white', margin: 0, fontSize: '1.6rem' }}>PetMatch & Alert</h1>
            </div>
            <div className="landing-title">
              Encuentra y Protege a tus <span>Mascotas</span>
            </div>
            <p style={{ color: '#88939e', fontSize: '0.95rem' }}>
              Únete a la mayor red vecinal inteligente de localización y cuidado temporal de animales de compañía.
            </p>
            <div className="connection-pill">
              <span>●</span> Red Vecinal Activa
            </div>
          </div>

          <div className="glass-panel" style={{ color: 'var(--text-primary)', border: 'none', background: 'white' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 700, color: 'var(--mongo-forest)' }}>Acceder a la Red</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Rol de Acceso</label>
                <select 
                  className="form-control" 
                  value={loginRole} 
                  onChange={e => setLoginRole(e.target.value)}
                >
                  <option value="Dueño">Dueño de Mascota (Reportar pérdidas)</option>
                  <option value="Cuidador">Cuidador de Mascotas (Ofrecer servicio/alertas)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  placeholder="ejemplo@email.com" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Documento de Identidad (DNI)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  required 
                  placeholder="Ingresa tu DNI..." 
                  value={loginDNI} 
                  onChange={e => setLoginDNI(e.target.value)}
                />
              </div>

              <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.75rem' }}>
                Ingresar a la Plataforma
              </button>

              <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>o</span>
              </div>

              <button 
                type="button" 
                className="btn btn-blue" 
                style={{ width: '100%' }} 
                onClick={handleEnterAnonymous}
              >
                Navegar como Invitado
              </button>
            </form>
          </div>
        </div>

        {/* Discreet Footer */}
        <footer className="discreet-footer" style={{ marginTop: '2rem' }}>
          <div>© 2026 PetMatch & Alert. Todos los derechos reservados.</div>
          <div>
            <button className="btn-link-seed" onClick={handleSeed}>
              Cargar Base de Datos Semilla (MySQL)
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // MAIN DASHBOARD FLOW
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <CustomLogoIcon size={32} />
          <div className="brand-text" style={{ textAlign: 'left' }}>
            <h1 style={{ color: 'white', fontSize: '1.25rem' }}>PetMatch & Alert</h1>
            <p style={{ color: 'var(--mongo-green)', fontSize: '0.75rem', fontWeight: 600 }}>Red de Búsqueda y Cuidado de Mascotas</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="nav-tabs">
            <button className={`nav-tab ${tab === 'lost_pets' ? 'active' : ''}`} onClick={() => setTab('lost_pets')}>
              🚨 Mascotas Perdidas
            </button>
            <button className={`nav-tab ${tab === 'buscador' ? 'active' : ''}`} onClick={() => setTab('buscador')}>
              🔍 Buscador por Imagen
            </button>
            <button className={`nav-tab ${tab === 'cuidadores' ? 'active' : ''}`} onClick={() => setTab('cuidadores')}>
              🏡 Red de Cuidadores
            </button>
          </div>

          {/* User Session Info */}
          <div style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--mongo-green)' }}>
                  {currentUser ? currentUser.email : 'Invitado Anónimo 👤'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Rol: {currentUser ? currentUser.role : 'visitante'}
                </div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'white', border: '1px solid #1a2f3b', background: '#0e2430' }} onClick={handleLogout}>
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Ticker de Alertas de Mascotas Perdidas */}
      <div className="live-ticker">
        <div className="ticker-pulse"></div>
        <div className="ticker-label">Última Alerta</div>
        <marquee className="ticker-content" scrollamount="3">{tickerMessage}</marquee>
      </div>

      {loading && <div style={{ color: 'var(--mongo-forest)', marginBottom: '1.25rem', fontWeight: 600 }}>Cargando operación...</div>}

      {/* User Dashboard Notification Summary */}
      {currentUser && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eefdf5', border: '1px solid var(--mongo-forest)' }}>
          <div style={{ textAlign: 'left' }}>
            <span>👤 Sesión activa como <strong>{currentUser.role}</strong>. </span>
            {currentUser.role === 'Dueño' ? (
              <span>Puedes registrar reportes de pérdidas en el mapa. Tus datos de contacto estarán ocultos.</span>
            ) : (
              loggedCaretaker ? (
                <span>
                  Perfil Cuidador: <strong>{loggedCaretaker.name}</strong> ({loggedCaretaker.is_verified ? 'Verificado ✓' : 'Pendiente de Validación de DNI'}).
                </span>
              ) : (
                <span>Completa tu registro abajo para activar la recepción de alertas.</span>
              )
            )}
          </div>
          {loggedCaretaker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div className="switch-container" style={{ background: 'white' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, marginRight: '0.5rem' }}>🔔 Recibir Alertas 1km (RF 3.3)</span>
                <label className="switch">
                  <input 
                    type="checkbox"
                    checked={loggedCaretaker.alert_notifications_enabled}
                    onChange={e => handleToggleAlerts(loggedCaretaker, e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: Mascotas Perdidas */}
      {tab === 'lost_pets' && (
        <div>
          {/* Active alerts Map */}
          {lostPets.length > 0 && (
            <div className="glass-panel panel-section" style={{ marginBottom: '2rem' }}>
              <h2 className="panel-title">🗺️ Mapa de Búsqueda Activa</h2>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                Mapa geográfico de alertas de extravío activas. Las alertas se emiten automáticamente a vecinos en un radio de 1 km.
              </p>
              <LeafletAlertsMap pets={lostPets} />
            </div>
          )}

          <div className="glass-panel panel-section" style={{ marginBottom: '2.5rem' }}>
            <h2 className="panel-title">🚨 Reportar Mascota Perdida</h2>
            {!currentUser ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p style={{ marginBottom: '1rem', fontWeight: 600 }}>Debe iniciar sesión como <strong>Dueño</strong> para registrar un reporte.</p>
                <button className="btn" onClick={handleLogout}>Ir al Inicio de Sesión</button>
              </div>
            ) : currentUser.role !== 'Dueño' ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p>Tu rol de sesión actual es <strong>{currentUser.role}</strong>. Cierra sesión e ingresa como <strong>Dueño de Mascota</strong> para reportar un extravío.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateLostPet} className="form-grid">
                <div>
                  <div className="form-group">
                    <label>Nombre de la Mascota</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="Ej. Fido..." 
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
                      placeholder="Detalles sobre collar, color..." 
                      value={petForm.description} 
                      onChange={e => setPetForm({...petForm, description: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <div className="form-group">
                    <label>Fotografía</label>
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
                    <label>Seleccionar Ubicación (Arrastra el marcador)</label>
                    <LeafletMapSelector 
                      lat={petForm.lat} 
                      lon={petForm.lon} 
                      onChange={(lat, lon) => setPetForm(prev => ({ ...prev, lat, lon }))}
                    />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>lat: <b>{petForm.lat}</b></div>
                      <div>lon: <b>{petForm.lon}</b></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="btn">
                      Disparar Alerta Geográfica (1 km)
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          <div>
            <h2>🚨 Listado de Alertas Activas</h2>
            <div className="grid-container">
              {lostPets.map(p => {
                const petId = p.id || p._id;
                return (
                  <div key={petId} className="card">
                    <div className="card-media">
                      <img src={p.photo} alt={p.name} />
                      <span className="card-badge" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>Perdido</span>
                    </div>
                    <div className="card-body">
                      <h3 className="card-title">{p.name}</h3>
                      <div className="card-subtitle">{p.species} | {p.breed}</div>
                      <p className="card-desc">{p.description}</p>
                      
                      <div style={{ fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.4rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                        📍 Coordenadas: [ {p.lat}, {p.lon} ]
                      </div>

                      {/* Sighting list */}
                      {p.sightings && p.sightings.length > 0 && (
                        <div style={{ marginBottom: '0.75rem', textAlign: 'left' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--mongo-forest)' }}>👁️ Avistamientos reportados ({p.sightings.length}):</strong>
                          <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            {p.sightings.map((s, idx) => (
                              <div key={s.id || s._id || idx} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.2rem', marginBottom: '0.2rem', fontSize: '0.75rem' }}>
                                📍 coords: [{s.lat}, {s.lon}] - <em>"{s.description}"</em>
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
                          👁️ Reportar Avistamiento Anónimo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sighting Modal */}
      {selectedPetForSighting && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2 className="panel-title">👁️ Reportar Avistamiento: {selectedPetForSighting.name}</h2>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Sube la foto y marca en el mapa dónde viste a la mascota de forma anónima.</p>
            
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

      {/* TAB 2: Buscador por Imagen */}
      {tab === 'buscador' && (
        <div>
          <div className="glass-panel panel-section">
            <h2 className="panel-title">🔍 Buscador Inteligente por Imagen</h2>
            <p style={{ marginBottom: '1.25rem' }}>
              Sube la foto de una mascota para realizar búsquedas específicas usando los filtros de la base de datos según tu propósito.
            </p>

            <form onSubmit={handleImageSearchSubmit} className="form-grid">
              <div>
                <div className="form-group">
                  <label>Propósito de Búsqueda</label>
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
                      📸 Selecciona una fotografía
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div style={{ marginTop: '2rem' }}>
              <div className="glass-panel" style={{ padding: '0', marginBottom: '1.25rem', textAlign: 'left', border: 'none' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--mongo-forest)', padding: '0.5rem 0' }}>
                  📊 Metadatos Detectados por la Imagen (Adapter RNF 2.1)
                </h3>
                <pre className="metadata-json">
                  {JSON.stringify(searchResults.detected_metadata, null, 2)}
                </pre>
              </div>

              <h2>📦 Resultados Encontrados ({searchResults.results.length})</h2>
              {searchResults.results.length === 0 ? (
                <p>No se encontraron registros que coincidan con la especie o raza de la imagen.</p>
              ) : (
                <div className="grid-container">
                  {searchResults.results.map((p, idx) => (
                    <div key={p.id || p._id || idx} className="card">
                      <div className="card-media">
                        <img src={p.photo} alt={p.name} />
                        <span className="card-badge" style={{ 
                          borderColor: p.source_type === 'ong_shelter' ? 'var(--accent-blue)' : (p.source_type === 'certified_breeder' ? 'var(--mongo-forest)' : 'var(--accent-red)'),
                          color: p.source_type === 'ong_shelter' ? 'var(--accent-blue)' : (p.source_type === 'certified_breeder' ? 'var(--mongo-forest)' : 'var(--accent-red)')
                        }}>
                          {p.source_type === 'ong_shelter' ? 'Albergue' : (p.source_type === 'certified_breeder' ? 'Criadero' : 'Perdido')}
                        </span>
                      </div>
                      <div className="card-body">
                        <h3 className="card-title">{p.name || 'Mascota'}</h3>
                        <div className="card-subtitle">{p.species} | {p.breed}</div>
                        <p className="card-desc">{p.description}</p>
                        <div className="card-meta">
                          <span>{p.source_name || (p.status === 'lost' ? 'Alerta Perdido' : 'Protectora')}</span>
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

      {/* TAB 3: Red de Cuidadores */}
      {tab === 'cuidadores' && (
        <div className="dashboard-grid">
          <div>
            {/* Create Caretaker */}
            <div className="glass-panel panel-section" style={{ marginBottom: '1.5rem' }}>
              <h2 className="panel-title">📝 Registrarse como Cuidador</h2>
              {currentUser && currentUser.role === 'Cuidador' && loggedCaretaker ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <p style={{ fontWeight: 600 }}>Ya te encuentras registrado como cuidador con el correo <strong>{currentUser.email}</strong>.</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Estado del perfil: {loggedCaretaker.is_verified ? '✓ Verificado y activo públicamente' : '⏳ Pendiente de validación de DNI en el panel lateral'}
                  </p>
                </div>
              ) : (
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
                      <label>Rol de Servicio (Factory Method)</label>
                      <select 
                        className="form-control"
                        value={caretakerForm.role}
                        onChange={e => setCaretakerForm({...caretakerForm, role: e.target.value})}
                      >
                        <option value="Cuidador Solidario">Cuidador Solidario (Gratuito)</option>
                        <option value="Cuidador Profesional">Cuidador Profesional (Pagado)</option>
                        <option value="Cuidador Especializado">Cuidador Especializado (Meds)</option>
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
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Administra medicamentos (RF 3.2)</span>
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
              )}
            </div>

            {/* Verified Caretakers */}
            <h2>🏡 Cuidadores Verificados</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {caretakers.length === 0 ? (
                <p>No hay cuidadores verificados registrados.</p>
              ) : (
                caretakers.map(c => {
                  const caretakerId = c.id || c._id;
                  return (
                    <div key={caretakerId} className="glass-panel" style={{ padding: '1.25rem', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderLeft: '4px solid var(--mongo-forest)' }}>
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
                            🔑 <b>Reglas (Factory):</b> Límite: {c.role_rules.max_pets} mascotas | Pago: {c.role_rules.allow_payment ? 'Permitido' : 'Gratuito'}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div className="switch-container">
                          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>🔔 Alertas Geográficas (Mascotas Perdidas)</span>
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
                          <form onSubmit={(e) => handleAddReview(caretakerId, e)} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
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
                  );
                })
              )}
            </div>
          </div>

          {/* Validation Sidebar */}
          <div>
            <div className="glass-panel panel-section">
              <h2 className="panel-title" style={{ color: 'var(--mongo-forest)' }}>🛡️ Verificación de Cuidadores (RNF 3.1)</h2>
              <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Antes de activar un perfil de cuidador de manera pública, valida la autenticidad de su DNI.
              </p>

              {unverifiedCaretakers.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No hay perfiles pendientes.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {unverifiedCaretakers.map(c => {
                    const caretakerId = c.id || c._id;
                    return (
                      <div key={caretakerId} style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong>{c.name}</strong>
                          <span style={{ color: 'var(--mongo-forest)', fontWeight: 700 }}>{c.role}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          DNI: <b>{c.id_document || 'No especificado'}</b>
                        </div>
                        <button 
                          className="btn" 
                          style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem' }}
                          onClick={() => handleVerifyCaretaker(caretakerId)}
                        >
                          ✓ Validar DNI y Habilitar Perfil
                        </button>
                      </div>
                    );
                  })}
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
            Cargar Datos de Semilla (MySQL)
          </button>
        </div>
      </footer>
    </div>
  );
}
