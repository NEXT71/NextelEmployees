// IP Restriction Middleware
// Allows access only from the specified IP address

const ALLOWED_IP = process.env.ALLOWED_IP || '182.189.117.252';

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

  console.log(`[IP Restriction] Client IP: ${normalizedIp}, Allowed IP: ${ALLOWED_IP}`);

  if (normalizedIp === ALLOWED_IP) {
    return next();
  }

  return res.status(403).json({
    error: 'Access Denied',
    message: 'Your IP address is not authorized to access this application.',
    clientIp: normalizedIp
  });
};

export default ipRestriction;
