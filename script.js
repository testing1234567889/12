const headers = {
  "Content-Type": "text/plain; charset=utf-8",
  "Accept": "application/json"
};

const PROFILE = "https://lh3.googleusercontent.com/a/ACg8ocIPKA79XuOnNj4vimb9anCvPYqjLE_HnFYulO-jbdgbxWQm9ME=s100";
const NAME = "wibu";

function parseTanggal(dateStr) {
  return new Date(dateStr.replace(" ", "T"));
}

function vipDate(epoch) {
  if (!epoch || epoch == 0) return "-";
  return new Date(epoch * 1000).toLocaleString();
}

function isTokenAktif() {
  const nama = localStorage.getItem("vipNama");
  const expDate = parseTanggal(localStorage.getItem("expDate") || "2000-01-01 00:00:00");
  const now = new Date();
  return nama && now < expDate;
}

function aturTampilanAwal() {
  const nama = localStorage.getItem("vipNama");
  if (!nama) {
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("aktivasiBox").style.display = "none";
    document.getElementById("statusBox").style.display = "none";
    return;
  }

  // Ambil data ulang dari Firebase
  firebase.database().ref('VipUser/' + nama).once('value').then(snapshot => {
    const data = snapshot.val();
    const now = new Date();
    const exp = parseTanggal(data?.expDate || "2000-01-01 00:00:00");

    if (!data || !data.aktif || now > exp) {
      logoutVIP(); // paksa logout
    } else {
      localStorage.setItem("expDate", data.expDate);
      localStorage.setItem("vipLevel", data.vipLevel);
      document.getElementById("loginBox").style.display = "none";
      document.getElementById("aktivasiBox").style.display = "block";
      document.getElementById("statusBox").style.display = "block";
    }
  }).catch(() => {
    logoutVIP(); // fallback jika data gagal diambil
  });
}

function cekTokenNama() {
  const nama = document.getElementById("namaInput").value.trim().toLowerCase();
  const output = document.getElementById("hasilLogin");

  if (!nama) {
    output.innerHTML = '<span class="error">❌ Nama tidak boleh kosong</span>';
    return;
  }

  output.innerHTML = '🔄 Mengecek database...';

  firebase.database().ref('VipUser/' + nama).once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) throw new Error("Nama tidak ditemukan di database.");
    if (!data.aktif) throw new Error("Akses tidak aktif.");
    const now = new Date();
    const exp = parseTanggal(data.expDate);
    if (now > exp) throw new Error("Masa aktif sudah habis.");

    localStorage.setItem("vipNama", nama);
    localStorage.setItem("expDate", data.expDate);
    localStorage.setItem("vipLevel", data.vipLevel);

    output.innerHTML = `<span class="success">✅ Login sukses sebagai VIP Level ${data.vipLevel}</span>`;
    aturTampilanAwal();
  }).catch(err => {
    output.innerHTML = '<span class="error">❌ ' + err.message + '</span>';
  });
}

function logoutVIP() {
  localStorage.clear();
  alert("🚪 Kamu telah logout.");
  location.reload();
}

async function prosesVip() {
  const email = document.getElementById("emailAktivasi").value.trim();
  const vipCode = document.getElementById("durasi").value;
  const result = document.getElementById("hasilAktivasi");

  if (!email) {
    result.innerHTML = '<span class="error">❌ Email tidak boleh kosong!</span>';
    return;
  }

  result.innerHTML = '🔄 Login...';

  try {
    const token = await login(email);
    const before = await getData(token);
    result.innerHTML = buatTabelStatus(before, 'Sebelum Aktivasi');

    await setPremium(token, vipCode);
    const after = await getData(token);
    result.innerHTML += buatTabelStatus(after, 'Setelah Aktivasi');
  } catch (err) {
    result.innerHTML = '<span class="error">❌ ' + err.message + '</span>';
  }
}

async function login(email) {
  const res = await fetch("https://apps.animekita.org/api/v1.1.6/model/login.php", {
    method: "POST",
    headers,
    body: JSON.stringify({
      user: NAME,
      email,
      profil: PROFILE
    })
  });

  const json = await res.json();
  if (!json.data || !json.data[0]) throw new Error("Login gagal");
  return json.data[0].token;
}

async function getData(token) {
  const res = await fetch("https://apps.animekita.org/api/v1.1.6/model/app-config.php", {
    method: "POST",
    headers,
    body: JSON.stringify({ token })
  });
  const json = await res.json();
  return json.data[0];
}

async function setPremium(token, vipCode) {
  const res = await fetch("https://apps.animekita.org/api/v1.1.6/model/vip.php", {
    method: "POST",
    headers,
    body: new URLSearchParams({ token, vip: vipCode })
  });

  const json = await res.json();
  if (json.status !== "success" && json.status !== 1) {
    throw new Error("Gagal aktivasi VIP.");
  }
  return json;
}

function buatTabelStatus(data, judul) {
  return `
    <h4>${judul}</h4>
    <table>
      <tr><th>Level</th><td>${data.level}</td></tr>
      <tr><th>Rank</th><td>${data.rank}</td></tr>
      <tr><th>VIP Level</th><td>${data.vipLevel}</td></tr>
      <tr><th>Kadaluarsa VIP</th><td>${vipDate(data.vipExp)}</td></tr>
    </table>
  `;
}

function cekStatus() {
  const nama = localStorage.getItem("vipNama");
  const exp = localStorage.getItem("expDate");
  const level = localStorage.getItem("vipLevel");
  document.getElementById("hasilStatus").innerHTML = `
    <div class="status-box">
      <b>Nama:</b> ${nama}<br>
      <b>VIP Level:</b> ${level}<br>
      <b>Berlaku sampai:</b> ${exp}
    </div>`;
}

async function cekStatusViaEmail() {
  const email = document.getElementById("cekEmail").value.trim();
  const hasil = document.getElementById("hasilStatusEmail");

  if (!email) {
    hasil.innerHTML = "<span class='error'>❌ Email tidak boleh kosong</span>";
    return;
  }

  hasil.innerHTML = "🔄 Memuat status VIP...";

  try {
    const token = await login(email);
    const data = await getData(token);
    hasil.innerHTML = `
      <div class="status-box">
        <table>
          <tr><th>👤 Email</th><td>${email}</td></tr>
          <tr><th>🔢 Level</th><td>${data.level}</td></tr>
          <tr><th>🏅 Rank</th><td>${data.rank}</td></tr>
          <tr><th>💎 VIP Level</th><td>${data.vipLevel}</td></tr>
          <tr><th>⏳ Expired</th><td>${vipDate(data.vipExp)}</td></tr>
        </table>
      </div>
    `;
  } catch (err) {
    hasil.innerHTML = `<span class='error'>❌ Gagal: ${err.message}</span>`;
  }
}

