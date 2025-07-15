import axios from "axios";


async function getPublicIp() {
  const res = await axios.get('https://api.ipify.org?format=json');
  return res.data.ip;
}

function getGeoInfo() {
  return axios.get('http://ip-api.com/json')
    .then(res => res.data);
}

export async function checkUserVPN() {
  const ip = await getPublicIp();  
  const geo = await getGeoInfo();      
  const country = geo.country;
  const isForeign = country !== 'Iran';

//   return {
//     ip,
//     country,
//     isp: geo.org,
//     vpnOn: isForeign,
//     message: isForeign
//       ? `🌍 Your IP (${ip}) is from ${country} — VPN likely ON.`
//       : `🛑 Your IP (${ip}) is from ${country} — VPN likely OFF.`
//   };

    return isForeign;
}

// Example usage:
checkUserVPN().then(console.log);
