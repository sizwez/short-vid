import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Play, Users, TrendingUp } from 'lucide-react';
import PremiumBackground from './PremiumBackground';

const features = [
  {
    id: 1,
    icon: Play,
    title: 'Create & Share',
    description: 'Record and share your videos with the Mzansi community. Show off your talent!',
    color: 'from-pink-500 to-orange-500',
  },
  {
    id: 2,
    icon: Users,
    title: 'Connect with Creators',
    description: 'Follow your favorite South African creators and discover new trending content.',
    color: 'from-purple-500 to-blue-500',
  },
  {
    id: 3,
    icon: TrendingUp,
    title: 'Go Viral',
    description: 'Join challenges, use trending hashtags, and get your content seen across the nation.',
    color: 'from-green-500 to-teal-500',
  },
];

const FeatureCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < features.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/onboarding/auth');
    }
  };

  const handleSkip = () => {
    navigate('/onboarding/auth');
  };

  return (
    <PremiumBackground>
      <div className="min-h-screen text-white p-6">
        <div className="max-w-md mx-auto h-full flex flex-col relative z-20">
          <div className="flex justify-end pt-8">
            <button 
              onClick={handleSkip}
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Skip
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center w-full"
              >
                <div className="relative inline-block mb-10">
                   {/* Animated ring around icon */}
                   <motion.div 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                     className={`absolute -inset-4 rounded-[40px] border border-white/5 bg-gradient-to-br ${features[currentSlide].color} opacity-20 blur-md`}
                   />
                   
                   <motion.div
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`relative w-36 h-36 rounded-[40px] bg-gradient-to-br ${features[currentSlide].color} flex items-center justify-center shadow-2xl shadow-black/50 border border-white/10`}
                  >
                    {React.createElement(features[currentSlide].icon, { className: 'w-16 h-16 text-white drop-shadow-lg' })}
                  </motion.div>
                </div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-black mb-6 tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
                >
                  {features[currentSlide].title}
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-300 text-lg px-6 leading-relaxed"
                >
                  {features[currentSlide].description}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pb-12">
            <div className="flex justify-center gap-3 mb-10">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index === currentSlide 
                      ? 'w-12 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                      : 'w-3 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="w-full bg-white text-black py-5 rounded-[24px] font-black text-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 shadow-2xl"
            >
              {currentSlide === features.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-6 h-6" />
            </motion.button>

            {currentSlide < features.length - 1 && (
              <button
                onClick={handleSkip}
                className="w-full text-gray-400 py-4 mt-2 text-sm font-medium hover:text-white transition-colors"
              >
                Already have an account? <span className="text-white underline decoration-orange-500/50 underline-offset-4">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </PremiumBackground>
  );
};

export default FeatureCarousel;