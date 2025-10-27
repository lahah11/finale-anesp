// Test script avec admin.rh qui fonctionne
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testRoutesWithAdminRh() {
  try {
    console.log('🧪 Test des routes avec admin.rh...\n');

    // 1. Test de connexion avec admin.rh
    console.log('1️⃣ Test de connexion avec admin.rh...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin.rh',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Connexion admin.rh réussie');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test route /api/users
    console.log('\n2️⃣ Test route /api/users...');
    try {
      const usersResponse = await axios.get(`${BASE_URL}/users`, { headers });
      console.log('✅ Route /api/users fonctionne');
      console.log(`   Nombre d'utilisateurs: ${usersResponse.data.length}`);
    } catch (error) {
      console.log('❌ Erreur route /api/users:', error.response?.data || error.message);
    }

    // 3. Test route /api/users/institution
    console.log('\n3️⃣ Test route /api/users/institution...');
    try {
      const usersInstitutionResponse = await axios.get(`${BASE_URL}/users/institution`, { headers });
      console.log('✅ Route /api/users/institution fonctionne');
      console.log(`   Nombre d'utilisateurs institution: ${usersInstitutionResponse.data.length}`);
    } catch (error) {
      console.log('❌ Erreur route /api/users/institution:', error.response?.data || error.message);
    }

    // 4. Test route /api/roles
    console.log('\n4️⃣ Test route /api/roles...');
    try {
      const rolesResponse = await axios.get(`${BASE_URL}/roles`, { headers });
      console.log('✅ Route /api/roles fonctionne');
      console.log(`   Nombre de rôles: ${rolesResponse.data.length}`);
    } catch (error) {
      console.log('❌ Erreur route /api/roles:', error.response?.data || error.message);
    }

    // 5. Test route /api/institutions
    console.log('\n5️⃣ Test route /api/institutions...');
    try {
      const institutionsResponse = await axios.get(`${BASE_URL}/institutions`, { headers });
      console.log('✅ Route /api/institutions fonctionne');
      console.log(`   Nombre d'institutions: ${institutionsResponse.data.length}`);
    } catch (error) {
      console.log('❌ Erreur route /api/institutions:', error.response?.data || error.message);
    }

    console.log('\n🎉 Tests terminés !');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

testRoutesWithAdminRh();
