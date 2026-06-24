import { useEffect, useState } from 'react';

const SOUTH_INDIAN_STATES = [
  'tamil nadu',
  'kerala',
  'karnataka',
  'andhra pradesh',
  'telangana'
];

export const useDynamicTheme = () => {
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    const checkTheme = async () => {
      try {
        // Get user location
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        const region = geoData.region?.toLowerCase() || '';
        const city = geoData.city || 'Unknown';
        
        setUserLocation(city);

        // Get current time in IST
        const now = new Date();
        const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const hours = istTime.getHours();
        const minutes = istTime.getMinutes();
        const currentTimeInMinutes = hours * 60 + minutes;

        // Check if between 10:00 AM and 12:00 PM IST (600 to 720 minutes)
        const isBetween10And12 = currentTimeInMinutes >= 600 && currentTimeInMinutes < 720;
        
        // Check if in South India
        const isSouthIndia = SOUTH_INDIAN_STATES.some(state => region.includes(state));

        // Apply light theme only if both conditions are met
        const shouldUseLightTheme = isBetween10And12 && isSouthIndia;
        setIsLightTheme(shouldUseLightTheme);

        // Apply theme to document
        if (shouldUseLightTheme) {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        }
      } catch (error) {
        console.error('Failed to determine theme:', error);
        // Default to dark theme on error
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        setIsLightTheme(false);
      }
    };

    checkTheme();
  }, []);

  return { isLightTheme, userLocation };
};
