import React, { useState, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface IntroSlide {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  description: string[];
  color: string;
}

const slides: IntroSlide[] = [
  {
    id: 1,
    icon: '📱',
    title: 'Easy Order Management',
    subtitle: 'Track 50+ orders daily',
    description: [
      'Copy orders from WhatsApp',
      'Never lose an order again',
      'Mark delivered instantly',
    ],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 2,
    icon: '💰',
    title: 'Payment Tracking',
    subtitle: 'Stop losing money',
    description: [
      'See who owes instantly',
      'Send professional reminders',
      'Track payment history',
    ],
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 3,
    icon: '🧠',
    title: 'Smart Recommendations',
    subtitle: 'AI-powered insights',
    description: [
      'Know what to cook tomorrow',
      'Reduce waste by 40%',
      'Maximize your profits',
    ],
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 4,
    icon: '🚀',
    title: 'Ready to Transform?',
    subtitle: 'Join 100+ food entrepreneurs',
    description: [
      'Free trial for 1 month',
      'No credit card required',
      'Cancel anytime',
    ],
    color: 'from-orange-500 to-red-500',
  },
];

interface IntroScreensProps {
  onComplete: () => void;
}

export function IntroScreens({ onComplete }: IntroScreensProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-advance first slide
  useEffect(() => {
    if (currentSlide === 0) {
      const timer = setTimeout(() => {
        setCurrentSlide(1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      handleNext();
    }

    if (touchStart - touchEnd < -75) {
      // Swipe right
      handlePrev();
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    setCurrentSlide(slides.length - 1);
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-50">
      <div
        className="h-full flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Skip Button */}
        {!isLastSlide && (
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 text-white/70 hover:text-white text-sm font-semibold z-10"
          >
            Skip
          </button>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          {/* Icon with gradient background */}
          <div
            className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.color} flex items-center justify-center mb-8 shadow-2xl animate-pulse`}
          >
            <span className="text-6xl">{slide.icon}</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-3">
            {slide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-white/80 mb-8">
            {slide.subtitle}
          </p>

          {/* Description Points */}
          <div className="space-y-4 max-w-md">
            {slide.description.map((point, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-left bg-white/10 backdrop-blur-sm rounded-xl p-4"
              >
                <Check className="text-green-400 flex-shrink-0" size={24} />
                <span className="text-white/90">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="pb-12 px-8">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          {isLastSlide ? (
            <div className="space-y-3">
              <button
                onClick={onComplete}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all transform hover:scale-105"
              >
                Get Started - Free Trial
              </button>
              <button
                onClick={onComplete}
                className="w-full text-white/70 hover:text-white text-sm py-2"
              >
                Already have an account? <span className="underline">Log In</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-8 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105"
            >
              Continue
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
