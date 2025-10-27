const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Test de connexion...\n');

    // Test avec super.admin
    console.log('1️⃣ Test avec super.admin...');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: 'super.admin',
        password: 'admin123'
      });
      console.log('✅ Connexion super.admin réussie');
      console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
    } catch (error) {
      console.log('❌ Erreur connexion super.admin:', error.response?.data || error.message);
    }

    // Test avec dt.test
    console.log('\n2️⃣ Test avec dt.test...');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: 'dt.test',
        password: 'admin123'
      });
      console.log('✅ Connexion dt.test réussie');
      console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
    } catch (error) {
      console.log('❌ Erreur connexion dt.test:', error.response?.data || error.message);
    }

    // Test avec admin.rh
    console.log('\n3️⃣ Test avec admin.rh...');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username: 'admin.rh',
        password: 'admin123'
      });
      console.log('✅ Connexion admin.rh réussie');
      console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
    } catch (error) {
      console.log('❌ Erreur connexion admin.rh:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

testLogin();