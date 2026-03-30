// IP Restriction Middleware
// Allows access only from specified IP address(es)
// Supports single IP or comma-separated list: "182.189.117.252,10.228.27.34"

const ALLOWED_IPS = (process.env.ALLOWED_IP || '182.189.117.252')
  .split(',')
  .map(ip => ip.trim());

export const ipRestriction = (req, res, next) => {
  // Get client IP from various headers
  // This handles proxies and cloud deployments
  const clientIp = 
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    req.ip;

  // Remove IPv6 prefix if exists (e.g., ::ffff:192.168.1.1 -> 192.168.1.1)
  const normalizedIp = clientIp.replace(/^::ffff:/, '');

  console.log(`[IP Restriction] Client IP: ${normalizedIp}, Allowed IPs: ${ALLOWED_IPS.join(', ')}`);

  // Check if client IP is in allowed list
  if (ALLOWED_IPS.includes(normalizedIp)) {
    return next();
  }

  return res.status(403).json({
    error: 'Access Denied',
    message: 'Your IP address is not authorized to access this application.',
    clientIp: normalizedIp,
    allowedIps: ALLOWED_IPS
  });
};

export default ipRestriction;
