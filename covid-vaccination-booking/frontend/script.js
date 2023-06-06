document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const adminLoginForm = document.getElementById('admin-login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Login successful');
        window.location.href = '/dashboard';
      } else {
        alert('Invalid email or password');
        const errors = data.errors.map((error) => `<li>${error.msg}</li>`);
        const loginErrors = document.getElementById('login-errors');
        if (loginErrors) {
          loginErrors.innerHTML = errors.join('');
        }
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const phone = document.getElementById('signup-phone').value;

      const response = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, phone }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Signup successful');
        window.location.href = '/login.html';
      } else {
        alert('Failed to signup');
        const errors = data.errors.map((error) => `<li>${error.msg}</li>`);
        const signupErrors = document.getElementById('signup-errors');
        if (signupErrors) {
          signupErrors.innerHTML = errors.join('');
        }
      }
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      const response = await fetch('http://localhost:3000/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        window.location.href = '/admin/dashboard';
      } else {
        alert('Invalid username or password');
      }
    });
  }

  const addCentreForm = document.getElementById('add-centre-form');

  if (addCentreForm) {
    addCentreForm.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const name = document.getElementById('centre-name').value;
      const address = document.getElementById('centre-address').value;
      const workingHours = document.getElementById('centre-working-hours').value;
      const availableVaccines = document.getElementById('centre-available-vaccines').value;
  
      try {
        const response = await fetch('http://localhost:3000/admin/addCentre', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, address, workingHours, availableVaccines }),
        });
  
        if (response.ok) {
          alert('Vaccination centre added successfully!');
        } else {
          throw new Error('Failed to add vaccination centre');
        }
      } catch (error) {
        console.error('Error adding vaccination centre:', error);
        alert('Failed to add vaccination centre. Please try again later.');
      }
    });
  }
  


  

  const removeCentreForm = document.getElementById('remove-centre-form');

  if (removeCentreForm) {
    removeCentreForm.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const name = document.getElementById('centre-name').value;
      const address = document.getElementById('centre-address').value;
  
      try {
        const response = await fetch('http://localhost:3000/admin/removeCentre', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, address }),
        });
  
        if (response.ok) {
          alert('Vaccination centre removed successfully!');
          $('#removeCentreModal').modal('hide');
        } else if (response.status === 404) {
          throw new Error('Vaccination centre not found');
        } else {
          throw new Error('Failed to remove vaccination centre');
        }
      } catch (error) {
        console.error('Error removing vaccination centre:', error);
        alert('Failed to remove vaccination centre. Please try again later.');
      }
    });
  }

  const getDosageDetailsLink = document.getElementById('get-dosage-details-link');
  const dosageDetailsContainer = document.getElementById('dosage-details-container');
  
  async function fetchDosageDetails() {
    try {
      const response = await fetch('http://localhost:3000/admin/dosageDetails');
      const data = await response.json();
  
      if (response.ok) {
        const dosageDetails = data.dosageDetails;
        displayDosageDetails(dosageDetails);
      } else {
        throw new Error(data.error || 'Failed to fetch dosage details');
      }
    } catch (error) {
      console.error('Error fetching dosage details:', error);
      alert('Failed to fetch dosage details. Please try again later.');
    }
  }
  
  if (getDosageDetailsLink) {
    getDosageDetailsLink.addEventListener('click', fetchDosageDetails);
  }
  
  function displayDosageDetails(dosageDetails) {
    dosageDetailsContainer.innerHTML = '';
  
    if (dosageDetails.length > 0) {
      dosageDetails.forEach((centre) => {
        const { name, address, availableVaccines } = centre
        const remainingDoses = availableVaccines && availableVaccines.length > 0 ? availableVaccines[0] : 0;
  
        const centreElement = document.createElement('div');
        centreElement.innerHTML = `
          <p>Centre: ${name}</p>
          <p>Address: ${address}</p>
          <p>Remaining Doses: ${remainingDoses}</p>
          <hr>
        `;
  
        dosageDetailsContainer.appendChild(centreElement);
      });
    } else {
      dosageDetailsContainer.innerHTML = '<p>No dosage details available</p>';
    }
  }
  

  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const centresContainer = document.getElementById('centres-container');
  
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const searchValue = searchInput.value.trim();
      if (searchValue === '') {
        return;
      }
  
      try {
        const response = await fetch(`/centers?search=${encodeURIComponent(searchValue)}`);
        const data = await response.json();
  
        if (response.ok) {
          const centres = data.centers;
          displayCentres(centres);
        } else {
          throw new Error(data.error || 'Failed to fetch vaccination centers');
        }
      } catch (error) {
        console.error('Error searching for vaccination centers:', error);
        alert('Failed to search for vaccination centers. Please try again later.');
      }
    });
  }
  
  function displayCentres(centres) {
    centresContainer.innerHTML = '';
  
    if (centres.length > 0) {
      centres.forEach((centre) => {
        const { _id, name, address, availableVaccines, availableSlots } = centre;
  
        const centreElement = document.createElement('div');
        centreElement.innerHTML = `
          <p>Name: ${name}</p>
          <p>Address: ${address}</p>
          <p>Available Vaccines: ${availableVaccines}</p>
          <p>Available Slots: ${availableSlots}</p>
          <button onclick="bookSlot('${_id}')">Book Slot</button>
          <hr>
        `;
  
        centresContainer.appendChild(centreElement);
      });
    } else {
      centresContainer.innerHTML = '<p>No vaccination centers found</p>';
    }
  }
  
  async function bookslot(name, age, centerName, centerAddress) {
    try {
      const response = await fetch('/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, age, centerName, centerAddress }), 
      });
      const data = await response.json();
  
      if (response.ok) {
        alert(data.message);
        if (searchForm) {
          searchForm.dispatchEvent(new Event('submit'));
        }
      } else {
        throw new Error(data.error || 'Failed to book vaccination slot');
      }
    } catch (error) {
      console.error('Error booking vaccination slot:', error);
      alert('Failed to book vaccination slot. Please try again later.');
    }
  }
  
  
  

  
});
