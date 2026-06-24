# Deployment Guide for YourTube (YouTube Clone)

## Fixed Issues ✅

### 1. Backend .env File Formatting Error
**Problem:** SMTP_HOST and SMTP_PORT were on the same line, breaking email configuration.
**Solution:** Separated them into individual lines in `server/.env`

### 2. Frontend API Configuration
**Problem:** Frontend was defaulting to localhost:5000 instead of production backend.
**Solution:** Updated `yourtube/src/lib/axiosinstance.js` to use production Render URL as fallback.

---

## Environment Variables Setup

### Backend (Render)
Add these environment variables in your Render dashboard:

```
PORT=5000
DB_URL=mongodb+srv://swathid:Swathi2004@cluster0.nriwtoo.mongodb.net/youtube_clone?retryWrites=true&w=majority
RAZORPAY_KEY_ID=rzp_test_T4kFaJNKZLpkQc
RAZORPAY_KEY_SECRET=amrZDKUyP1qo5v5V1CpnZARf
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=swathidhanaraj1604@gmail.com
SMTP_PASS=rosw exmf stjl djak
```

### Frontend (Vercel)
Add this environment variable in your Vercel dashboard:

```
NEXT_PUBLIC_BACKEND_URL=https://yourtube-backend-sc57.onrender.com
```

---

## Deployment Steps

### Backend (Render)

1. **Push the fixed .env file to Render:**
   - Go to your Render dashboard
   - Navigate to your backend service
   - Update the environment variables with the corrected SMTP configuration
   - Redeploy the service

2. **Verify SMTP Configuration:**
   - Ensure Gmail app password is correct
   - Make sure "Less secure app access" is enabled OR use App Password
   - Test email sending functionality

### Frontend (Vercel)

1. **Add Environment Variable:**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add `NEXT_PUBLIC_BACKEND_URL` with value: `https://yourtube-backend-sc57.onrender.com`
   - Redeploy the project

2. **Verify API Connection:**
   - Test signup/OTP flow
   - Check browser console for any API errors
   - Verify CORS is working correctly

---

## Testing Checklist

### Authentication Flow
- [ ] Sign up with email (South India regions)
- [ ] Sign up with mobile (Rest of India)
- [ ] OTP verification
- [ ] Login functionality
- [ ] Profile update

### Video Features
- [ ] Video upload
- [ ] Video playback
- [ ] Like/unlike videos
- [ ] Add to watch later
- [ ] View history
- [ ] Comments

### Additional Features
- [ ] Search functionality
- [ ] Channel pages
- [ ] Payment integration (Razorpay)
- [ ] Download functionality

---

## Common Issues & Solutions

### OTP Not Received
1. **Check SMTP credentials** in Render environment variables
2. **Verify Gmail App Password** is correct
3. **Enable 2FA** on Gmail and generate App Password
4. **Check Render logs** for email sending errors

### API Connection Errors
1. **Verify NEXT_PUBLIC_BACKEND_URL** is set in Vercel
2. **Check CORS configuration** in backend (currently set to `*`)
3. **Test backend health** at `https://yourtube-backend-sc57.onrender.com/`

### MongoDB Connection Issues
1. **Verify DB_URL** is correct in Render
2. **Check IP whitelist** in MongoDB Atlas
3. **Ensure database user has correct permissions**

---

## Local Development

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd yourtube
npm install
npm run dev
```

---

## Important Notes

1. **Never commit .env files** to git (they're in .gitignore)
2. **Use App Passwords** for Gmail SMTP (not regular password)
3. **Keep secrets secure** in production environment variables
4. **Monitor logs** on both Render and Vercel for errors
5. **Test thoroughly** after each deployment

---

## Contact & Support

If you encounter issues:
1. Check Render logs for backend errors
2. Check Vercel logs for frontend errors
3. Verify all environment variables are set correctly
4. Test API endpoints individually using Postman/curl
