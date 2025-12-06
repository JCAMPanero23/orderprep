  🎨 Customizing the Onboarding System

  📁 Key Files to Modify:

  D:\OrderPrep\
  ├── components/
  │   ├── IntroScreens.tsx    ← Intro slides (content, design, flow)
  │   ├── SignUpForm.tsx       ← Signup form design
  │   └── LoginForm.tsx        ← Login form design
  ├── App.tsx                  ← Auth flow logic
  └── AuthContext.tsx          ← Authentication logic

  ---
  1️⃣ Redesigning Intro Screens

  Edit Slide Content (components/IntroScreens.tsx:23-75)

  const slides: IntroSlide[] = [
    {
      id: 1,
      icon: '📱',  // ← Change emoji
      title: 'Your Custom Title',  // ← Change title
      subtitle: 'Your custom subtitle',  // ← Change subtitle
      description: [  // ← Change bullet points
        'First benefit',
        'Second benefit',
        'Third benefit',
      ],
      color: 'from-blue-500 to-cyan-500',  // ← Change gradient
    },
    // Add more slides...
  ];

  Add/Remove Slides

  Just add or remove objects from the slides array:

  // Add a 5th slide
  {
    id: 5,
    icon: '🎉',
    title: 'New Feature',
    subtitle: 'Check this out',
    description: ['Benefit 1', 'Benefit 2'],
    color: 'from-indigo-500 to-purple-500',
  }

  Change Auto-Advance Timing (line 84)

  // Change from 3 seconds to 5 seconds
  setTimeout(() => {
    setCurrentSlide(1);
  }, 5000);  // ← Change this number

  Customize Colors & Styling

  // Background gradient (line 123)
  <div className="fixed inset-0 bg-gradient-to-br from-purple-900 to-indigo-800">

  // Icon circle (line 143)
  className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.color}`}

  // Button colors (line 201)
  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"

  ---
  2️⃣ Redesigning Signup Form

  Change Form Fields (components/SignUpForm.tsx)

  Add new fields:

  const [formData, setFormData] = useState<SignUpData>({
    email: '',
    password: '',
    businessName: '',
    ownerName: '',
    phone: '',
    // Add new fields
    city: '',
    country: '',
  });

  Then add the input in the JSX:

  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      City
    </label>
    <input
      type="text"
      value={formData.city}
      onChange={(e) => handleChange('city', e.target.value)}
      placeholder="Dubai"
      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl"
    />
  </div>

  Change Colors (line 116)

  // Background
  <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600">

  // Button
  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"

  Disable Google Sign-In

  Comment out or remove lines 95-98 and 115-129:

  // {/* Google Sign-In Button */}
  // <div className="mb-6">
  //   <div id="googleSignUpButton" className="flex justify-center"></div>
  // </div>

  ---
  3️⃣ Changing the Auth Flow

  Skip Intro Screens Entirely

  Edit App.tsx:23-29:

  // Comment out intro logic
  // useEffect(() => {
  //   const hasSeenIntro = localStorage.getItem('has_completed_intro') === 'true';
  //   if (!hasSeenIntro && !authState.isAuthenticated) {
  //     setShowIntro(true);
  //   }
  // }, [authState.isAuthenticated]);

  Start with Login Instead of Signup

  Edit App.tsx:21:

  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');  // ← Change to 'login'

  Add a Welcome Screen Before Intro

  Create a new component WelcomeScreen.tsx:

  export function WelcomeScreen({ onStart }: { onStart: () => void }) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">OrderPrep</h1>
          <p className="text-xl text-white/80 mb-8">
            Manage your food business like a pro
          </p>
          <button
            onClick={onStart}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  Then update App.tsx:

  const [showWelcome, setShowWelcome] = useState(true);

  if (showWelcome) {
    return <WelcomeScreen onStart={() => setShowWelcome(false)} />;
  }

  ---
  4️⃣ Quick Design Changes

  Change Icon/Logo

  Replace the emoji 📱 with an image:

  // Instead of:
  <span className="text-4xl">📱</span>

  // Use:
  <img src="/logo.png" alt="OrderPrep" className="w-16 h-16" />

  Add Custom Animations

  // Add to intro screen content
  <div className="animate-bounce">
    <span className="text-6xl">{slide.icon}</span>
  </div>

  // Or fade in
  <h1 className="text-4xl font-bold text-white mb-3 animate-fade-in">
    {slide.title}
  </h1>

  Then add to index.html styles:

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.6s ease-out;
  }

  ---
  5️⃣ Testing Your Changes

  Reset Onboarding to Test

  In browser console:

  // Clear intro completion flag
  localStorage.removeItem('has_completed_intro');

  // Clear auth to see full flow
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');

  // Refresh
  location.reload();

  Or Add a Debug Button

  Add to Settings.tsx:

  <Button
    onClick={() => {
      localStorage.removeItem('has_completed_intro');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.reload();
    }}
    className="bg-purple-600 text-white"
  >
    🔄 Reset Onboarding (Debug)
  </Button>

  ---
  6️⃣ Common Design Ideas

  Option 1: Minimal Onboarding

  - Remove intro screens
  - Single-page signup with Google Sign-In only
  - No email/password option

  Option 2: Interactive Onboarding

  - Add input fields during intro slides
  - Collect business info step-by-step
  - Auto-create account at end

  Option 3: Video/GIF Intro

  - Replace icon with video/GIF demos
  - Show actual app screenshots
  - More visual, less text

  Option 4: Gamified Onboarding

  - Progress bar with milestones
  - Achievements for completing steps
  - Fun animations and confetti

  ---
  7️⃣ Quick Template Swap

  Want a completely different design? Here's a minimal version:

  Minimal Intro Screen (replace IntroScreens.tsx):

  export function IntroScreens({ onComplete }: IntroScreensProps) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">OrderPrep</h1>
          <p className="text-lg text-gray-600 mb-8">
            The smartest way to manage your food business
          </p>
          <button
            onClick={onComplete}
            className="w-full bg-black text-white py-4 px-8 rounded-lg font-semibold"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  ---
  🛠️ Best Practices

  1. Keep it short: 3-4 slides max, people skip long intros
  2. Show value first: Lead with benefits, not features
  3. Mobile-first: Test on phone, that's where users are
  4. Fast loading: Avoid large images/videos in intro
  5. Easy skip: Always allow users to skip intro

  ---
  📝 Need Help?

  Just tell me what you want to change:
  - "Make intro screens darker"
  - "Remove Google Sign-In"
  - "Add a city field to signup"
  - "Change button colors to green"
  - "Skip intro screens completely"

  I can make those specific changes for you! What would you like to redesign first?