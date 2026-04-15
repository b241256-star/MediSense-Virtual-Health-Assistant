// ============================================================
//  HOSPITALS.JS — MediSense AI Hospital Module (Backend Connected)
// ============================================================


let currentHospitals = [];
let userLocation = null;

function fetchHospitals() {
  return [
    {
      name: "SMS Hospital Jaipur",
      type: "government",
      address: "JLN Marg, Jaipur",
      rating: 4.2,
      distance_km: 2.5
    },
    {
      name: "RUHS Hospital",
      type: "government",
      address: "Kumbha Marg, Pratap Nagar",
      rating: 4.1,
      distance_km: 6.0
    },
    {
      name: "Jaipur National University Hospital",
      type: "private",
      address: "Jagatpura, Jaipur",
      rating: 4.0,
      distance_km: 8.5
    },
    {
      name: "Fortis Escorts Hospital",
      type: "private",
      address: "Malviya Nagar, Jaipur",
      rating: 4.5,
      distance_km: 5.1
    },
    {
      name: "EHCC Hospital",
      type: "private",
      address: "Sitapura, Jaipur",
      rating: 4.3,
      distance_km: 7.0
    },
    {
      name: "Apex Hospital",
      type: "private",
      address: "Malviya Nagar, Jaipur",
      rating: 4.1,
      distance_km: 4.8
    },
    {
      name: "Narayana Multispeciality Hospital",
      type: "private",
      address: "Pratap Nagar, Jaipur",
      rating: 4.4,
      distance_km: 6.5
    },
    {
      name: "Santokba Durlabhji Memorial Hospital",
      type: "private",
      address: "Bhawani Singh Marg, Jaipur",
      rating: 4.2,
      distance_km: 3.2
    },
    {
      name: "CK Birla Hospital",
      type: "private",
      address: "Tonk Road, Jaipur",
      rating: 4.6,
      distance_km: 4.0
    },
    {
      name: "Metro MAS Hospital",
      type: "private",
      address: "Mansarovar, Jaipur",
      rating: 4.3,
      distance_km: 5.7
    },
    {
      name: "Shalby Hospital",
      type: "private",
      address: "Vaishali Nagar, Jaipur",
      rating: 4.4,
      distance_km: 9.0
    },
    {
      name: "Manipal Hospital Jaipur",
      type: "private",
      address: "Jagatpura Road, Jaipur",
      rating: 4.5,
      distance_km: 8.2
    },
    {
      name: "Seva Clinic Jaipur",
      type: "clinic",
      address: "Vaishali Nagar, Jaipur",
      rating: 4.0,
      distance_km: 3.5
    },
    {
      name: "City Care Clinic",
      type: "clinic",
      address: "Mansarovar, Jaipur",
      rating: 4.1,
      distance_km: 4.2
    },
    {
      name: "LifeLine 24x7 Emergency Hospital",
      type: "emergency",
      address: "Tonk Road, Jaipur",
      rating: 4.3,
      distance_km: 5.0
    },
    {
      name: "Emergency Care Center Jaipur",
      type: "emergency",
      address: "Malviya Nagar, Jaipur",
      rating: 4.2,
      distance_km: 4.8
    }
  ];
}
function renderHospitals(filter = 'all') {
  const grid = document.getElementById('hospitalsGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Loading hospitals...</p></div>';

  let data = fetchHospitals();

  if (filter !== 'all') {
    data = data.filter(h => h.type && h.type.toLowerCase() === filter.toLowerCase());
  }

  if (!data.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">
        <i class="fas fa-hospital" style="font-size:3rem;opacity:0.3;display:block;margin-bottom:1rem;"></i>
        <p>No hospitals found for this filter.</p>
      </div>`;
    return;
  }

  const typeIcons = { government: '🏛️', private: '🏥', clinic: '🩺', emergency: '🚨' };

  grid.innerHTML = data.map(h => {
    const typeKey = h.type ? h.type.toLowerCase() : 'private';
    const icon = typeIcons[typeKey] || '🏥';

    const distText = h.distance_km ? `📏 ${h.distance_km} km` : '';

    return `
      <div class="hosp-card">
        <div class="hosp-card-top ${typeKey === 'government' ? 'govt' : 'pvt'}">
          <div class="hosp-top-icon">${icon}</div>
          <span class="hosp-top-badge">${h.type || 'Hospital'}</span>
          <span class="hosp-dist-badge">${distText}</span>
        </div>
        <div class="hosp-body">
          <div class="hosp-name">${h.name}</div>
          <div class="hosp-addr">
            <i class="fas fa-map-marker-alt"></i>
            <span>${h.address}</span>
          </div>
          <div class="hosp-meta-row">
            <span class="hosp-rating">⭐ ${h.rating || '4.0'}</span>
          </div>
          <div class="hosp-actions">
            <button class="hosp-btn hosp-btn-dir" onclick="openDirections('${h.name.replace(/'/g, "\\'")}', '${(h.address || '').replace(/'/g, "\\'")}')">
              <i class="fas fa-directions"></i> Directions
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterHospitals(btn, type) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHospitals(type);
}

function openDirections(name, address) {
  const query = encodeURIComponent(name + ', ' + address);
  window.open('https://www.google.com/maps/search/?api=1&query=' + query, '_blank');
}

function locateMe() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  const btn = event.currentTarget || event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      const searchInput = document.getElementById('locationSearchInput');
      if (searchInput) {
        searchInput.value = `${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E`;
      }
      btn.innerHTML = '<i class="fas fa-crosshairs"></i> My Location';
      btn.disabled = false;
      renderHospitals('all'); // Re-fetch with distance
    },
    () => {
      alert('Could not get your location. Please check browser permissions and try again.');
      btn.innerHTML = originalText;
      btn.disabled = false;
    },
    { timeout: 8000 }
  );
}

function searchHospitals() {
  const location = document.getElementById('locationSearchInput')?.value || 'Jaipur';
  const query = encodeURIComponent('hospitals near ' + location);
  window.open('https://www.google.com/maps/search/' + query, '_blank');
}
