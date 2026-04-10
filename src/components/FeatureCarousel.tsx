import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Play, Users, TrendingUp } from 'lucide-react';

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
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto h-full flex flex-col">
        <div className="flex justify-end pt-8">
          <button 
            onClick={handleSkip}
            className="text-gray-400 hover:text-white text-sm"
          >
            Skip
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${features[currentSlide].color} mx-auto mb-8 flex items-center justify-center`}
              >
                {React.createElement(features[currentSlide].icon, { className: 'w-14 h-14 text-white' })}
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-4"
              >
                {features[currentSlide].title}
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-400 text-lg px-4"
              >
                {features[currentSlide].description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pb-8">
          <div className="flex justify-center gap-2 mb-8">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'w-8 bg-orange-500' 
                    : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            {currentSlide === features.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>

          {currentSlide < features.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full text-gray-400 py-3 mt-2 text-sm"
            >
              Already have an account? <span className="text-orange-500">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureCarousel;