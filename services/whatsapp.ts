
// WhatsApp Utility

export const openWhatsApp = (mobile: string, message: string) => {
  const encodedMsg = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=91${mobile}&text=${encodedMsg}`;
  window.open(url, '_blank');
};

export const generateTeacherAccessLink = (ownerMobile: string, instituteName: string, code: string) => {
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    action: 'join',
    om: btoa(ownerMobile), // Base64 for a bit of obfuscation
    in: btoa(instituteName),
    tc: btoa(code)
  });
  return `${baseUrl}?${params.toString()}`;
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};
