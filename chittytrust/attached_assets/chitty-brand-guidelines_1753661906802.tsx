import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Circle, Square, Triangle, Zap, Users, Target, Palette, Type, Layout, MessageCircle, Star, Sparkles } from 'lucide-react';

const ChittyBrandGuidelines = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [animationTrigger, setAnimationTrigger] = useState(0);

  // Trigger animation when page changes
  useEffect(() => {
    setAnimationTrigger(prev => prev + 1);
  }, [currentPage]);

  const pages = [
    {
      id: 'overview',
      title: 'Brand Overview',
      icon: <Star className="w-6 h-6" />,
      content: 'BrandOverview'
    },
    {
      id: 'emblem-1',
      title: 'The Chitty Mark',
      icon: <Circle className="w-6 h-6" />,
      content: 'Emblem1'
    },
    {
      id: 'emblem-2', 
      title: 'The Flow Icon',
      icon: <Triangle className="w-6 h-6" />,
      content: 'Emblem2'
    },
    {
      id: 'emblem-3',
      title: 'The System Badge',
      icon: <Square className="w-6 h-6" />,
      content: 'Emblem3'
    },
    {
      id: 'emblem-4',
      title: 'The Dynamic Spark',
      icon: <Zap className="w-6 h-6" />,
      content: 'Emblem4'
    },
    {
      id: 'colors',
      title: 'Color System',
      icon: <Palette className="w-6 h-6" />,
      content: 'ColorSystem'
    },
    {
      id: 'typography',
      title: 'Typography',
      icon: <Type className="w-6 h-6" />,
      content: 'Typography'
    },
    {
      id: 'voice',
      title: 'Brand Voice',
      icon: <MessageCircle className="w-6 h-6" />,
      content: 'BrandVoice'
    }
  ];

  const BrandOverview = () => (
    <div className="space-y-8 text-center">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Chitty Brand Bible
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Where professional excellence meets accessible innovation. No BS, just results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
          <Target className="w-8 h-8 text-blue-600 mx-auto mb-4" />
          <h3 className="font-bold text-blue-900 mb-2">Direct & Effective</h3>
          <p className="text-blue-700 text-sm">No fluff, no confusion. Clear communication that gets results.</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
          <Users className="w-8 h-8 text-purple-600 mx-auto mb-4" />
          <h3 className="font-bold text-purple-900 mb-2">Human-First</h3>
          <p className="text-purple-700 text-sm">ADHD-friendly, spectrum-aware, designed for real humans.</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
          <Sparkles className="w-8 h-8 text-green-600 mx-auto mb-4" />
          <h3 className="font-bold text-green-900 mb-2">Quality Obsessed</h3>
          <p className="text-green-700 text-sm">Excellence without compromise. Never settle for "good enough".</p>
        </div>
      </div>

      <div className="bg-gray-50 p-8 rounded-2xl border">
        <h3 className="text-2xl font-bold mb-4">Brand Essence</h3>
        <p className="text-lg text-gray-700 leading-relaxed">
          Chitty bridges the gap between <span className="font-bold text-blue-600">professional-grade tools</span> and 
          <span className="font-bold text-purple-600"> accessible design</span>. We're building the future where 
          technology empowers without overwhelming, where AI enhances human capability rather than replacing it.
        </p>
      </div>
    </div>
  );

  const Emblem1 = () => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">The Chitty Mark</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Our primary brand mark combines chat bubbles with circuit patterns, representing human-AI collaboration.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div 
            className="relative p-8 bg-white rounded-3xl shadow-lg border-2 border-blue-100 transition-all duration-300 hover:shadow-xl hover:scale-105"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg width="120" height="120" viewBox="0 0 120 120" className="transition-all duration-500">
              {/* Main chat bubble */}
              <circle 
                cx="45" 
                cy="45" 
                r="35" 
                fill="#3B82F6" 
                className={`transition-all duration-500 ${isHovered ? 'animate-pulse' : ''}`}
              />
              
              {/* Circuit lines */}
              <path 
                d="M20 45 L80 45 M45 20 L45 80 M65 65 L95 65 M95 40 L95 90" 
                stroke="#8B5CF6" 
                strokeWidth="3" 
                fill="none"
                className={`transition-all duration-500 ${isHovered ? 'stroke-purple-400' : ''}`}
              />
              
              {/* Secondary bubble */}
              <circle 
                cx="85" 
                cy="75" 
                r="20" 
                fill="#8B5CF6" 
                className={`transition-all duration-500 ${isHovered ? 'fill-purple-400' : ''}`}
              />
              
              {/* Connection dots */}
              <circle cx="65" cy="55" r="3" fill="#10B981" className={isHovered ? 'animate-bounce' : ''} />
              <circle cx="75" cy="65" r="3" fill="#10B981" className={isHovered ? 'animate-bounce' : ''} style={{animationDelay: '0.1s'}} />
              <circle cx="85" cy="45" r="3" fill="#10B981" className={isHovered ? 'animate-bounce' : ''} style={{animationDelay: '0.2s'}} />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-3">Primary Usage</h4>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li>• App icons and favicons</li>
              <li>• Header logos</li>
              <li>• Business cards</li>
              <li>• Social media profiles</li>
            </ul>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-3">Variations</h4>
            <ul className="text-purple-700 space-y-2 text-sm">
              <li>• Monochrome version</li>
              <li>• Outline only</li>
              <li>• Single color</li>
              <li>• Animated version</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const Emblem2 = () => {
    const [rotation, setRotation] = useState(0);
    
    useEffect(() => {
      const interval = setInterval(() => {
        setRotation(prev => (prev + 45) % 360);
      }, 2000);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">The Flow Icon</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Representing seamless workflow and continuous improvement. Dynamic and adaptable.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative p-8 bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl shadow-lg border-2 border-purple-100">
            <svg width="120" height="120" viewBox="0 0 120 120">
              {/* Flowing triangular paths */}
              <g transform={`rotate(${rotation} 60 60)`} className="transition-transform duration-1000 ease-in-out">
                <path 
                  d="M60 20 L80 50 L60 80 L40 50 Z" 
                  fill="url(#flowGradient1)" 
                  className="opacity-80"
                />
                <path 
                  d="M30 40 L50 70 L30 100 L10 70 Z" 
                  fill="url(#flowGradient2)" 
                  className="opacity-60"
                />
                <path 
                  d="M90 40 L110 70 L90 100 L70 70 Z" 
                  fill="url(#flowGradient3)" 
                  className="opacity-60"
                />
              </g>
              
              {/* Central hub */}
              <circle cx="60" cy="60" r="8" fill="#10B981" className="animate-pulse" />
              
              <defs>
                <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <linearGradient id="flowGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-3">Best For</h4>
            <ul className="text-purple-700 space-y-2 text-sm">
              <li>• Loading animations</li>
              <li>• Process indicators</li>
              <li>• Workflow diagrams</li>
              <li>• Interactive elements</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-3">Concept</h4>
            <p className="text-blue-700 text-sm">
              The Flow Icon embodies movement, progress, and the interconnected nature of the Chitty ecosystem. 
              Each triangle represents a different aspect of the platform working in harmony.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const Emblem3 = () => {
    const [activeSquare, setActiveSquare] = useState(0);
    
    useEffect(() => {
      const interval = setInterval(() => {
        setActiveSquare(prev => (prev + 1) % 9);
      }, 800);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">The System Badge</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Modular, systematic, reliable. Represents the comprehensive nature of ChittyOS.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative p-8 bg-white rounded-3xl shadow-lg border-2 border-green-100">
            <svg width="120" height="120" viewBox="0 0 120 120">
              {/* Grid of squares */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                const row = Math.floor(index / 3);
                const col = index % 3;
                const x = 30 + col * 30;
                const y = 30 + row * 30;
                const isActive = activeSquare === index;
                
                return (
                  <rect
                    key={index}
                    x={x}
                    y={y}
                    width="20"
                    height="20"
                    rx="4"
                    fill={isActive ? "#10B981" : "#E5E7EB"}
                    className="transition-all duration-300"
                    style={{
                      transform: isActive ? 'scale(1.2)' : 'scale(1)',
                      transformOrigin: `${x + 10}px ${y + 10}px`
                    }}
                  />
                );
              })}
              
              {/* Connecting lines */}
              <g stroke="#94A3B8" strokeWidth="2" opacity="0.5">
                <line x1="40" y1="50" x2="60" y2="50" />
                <line x1="70" y1="50" x2="90" y2="50" />
                <line x1="40" y1="80" x2="60" y2="80" />
                <line x1="70" y1="80" x2="90" y2="80" />
                <line x1="50" y1="40" x2="50" y2="60" />
                <line x1="50" y1="70" x2="50" y2="90" />
                <line x1="80" y1="40" x2="80" y2="60" />
                <line x1="80" y1="70" x2="80" y2="90" />
              </g>
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <h4 className="font-bold text-green-900 mb-3">System Elements</h4>
            <ul className="text-green-700 space-y-2 text-sm">
              <li>• Cases & Documents</li>
              <li>• Chain & Verify</li>
              <li>• Trust & Consultant</li>
              <li>• Sync & Finance</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-3">Usage Context</h4>
            <ul className="text-gray-700 space-y-2 text-sm">
              <li>• Dashboard headers</li>
              <li>• System status</li>
              <li>• Module indicators</li>
              <li>• Integration badges</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const Emblem4 = () => {
    const [sparkPosition, setSparkPosition] = useState({ x: 60, y: 60 });
    
    useEffect(() => {
      const interval = setInterval(() => {
        setSparkPosition({
          x: 40 + Math.random() * 40,
          y: 40 + Math.random() * 40
        });
      }, 1500);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">The Dynamic Spark</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Innovation, energy, breakthrough moments. For highlighting special features and achievements.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative p-8 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl shadow-lg border-2 border-yellow-200">
            <svg width="120" height="120" viewBox="0 0 120 120">
              {/* Lightning bolt shape */}
              <path 
                d="M60 10 L45 50 L65 50 L50 110 L75 60 L55 60 Z" 
                fill="url(#sparkGradient)" 
                className="drop-shadow-lg"
              />
              
              {/* Dynamic sparks */}
              <g>
                <circle 
                  cx={sparkPosition.x} 
                  cy={sparkPosition.y} 
                  r="3" 
                  fill="#F59E0B" 
                  className="animate-ping"
                />
                <circle 
                  cx={sparkPosition.x + 20} 
                  cy={sparkPosition.y - 10} 
                  r="2" 
                  fill="#EF4444" 
                  className="animate-pulse"
                />
                <circle 
                  cx={sparkPosition.x - 15} 
                  cy={sparkPosition.y + 15} 
                  r="2" 
                  fill="#8B5CF6" 
                  className="animate-bounce"
                />
              </g>
              
              {/* Energy rings */}
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                fill="none" 
                stroke="#F59E0B" 
                strokeWidth="2" 
                opacity="0.3"
                className="animate-pulse"
              />
              <circle 
                cx="60" 
                cy="60" 
                r="35" 
                fill="none" 
                stroke="#EF4444" 
                strokeWidth="1" 
                opacity="0.5"
                className="animate-ping"
              />
              
              <defs>
                <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
            <h4 className="font-bold text-yellow-900 mb-3">Perfect For</h4>
            <ul className="text-yellow-800 space-y-2 text-sm">
              <li>• Feature announcements</li>
              <li>• Achievement badges</li>
              <li>• Call-to-action buttons</li>
              <li>• Success indicators</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
            <h4 className="font-bold text-orange-900 mb-3">Energy & Innovation</h4>
            <p className="text-orange-800 text-sm">
              The Dynamic Spark represents breakthrough moments and innovative solutions. 
              Use sparingly for maximum impact and to highlight truly exceptional features.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const ColorSystem = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Color System</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Professional, accessible, and vibrant. Our colors work together to create clarity and confidence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Primary Blue */}
        <div className="space-y-4">
          <div className="h-24 bg-blue-600 rounded-lg shadow-lg"></div>
          <div>
            <h4 className="font-bold text-blue-900">Primary Blue</h4>
            <p className="text-sm text-blue-700">#3B82F6</p>
            <p className="text-xs text-blue-600">Trust, reliability, professionalism</p>
          </div>
        </div>

        {/* Secondary Purple */}
        <div className="space-y-4">
          <div className="h-24 bg-purple-600 rounded-lg shadow-lg"></div>
          <div>
            <h4 className="font-bold text-purple-900">Secondary Purple</h4>
            <p className="text-sm text-purple-700">#8B5CF6</p>
            <p className="text-xs text-purple-600">Innovation, creativity, AI</p>
          </div>
        </div>

        {/* Success Green */}
        <div className="space-y-4">
          <div className="h-24 bg-green-600 rounded-lg shadow-lg"></div>
          <div>
            <h4 className="font-bold text-green-900">Success Green</h4>
            <p className="text-sm text-green-700">#10B981</p>
            <p className="text-xs text-green-600">Achievement, growth, positive action</p>
          </div>
        </div>

        {/* Accent Orange */}
        <div className="space-y-4">
          <div className="h-24 bg-orange-500 rounded-lg shadow-lg"></div>
          <div>
            <h4 className="font-bold text-orange-900">Accent Orange</h4>
            <p className="text-sm text-orange-700">#F97316</p>
            <p className="text-xs text-orange-600">Energy, attention, important actions</p>
          </div>
        </div>
      </div>

      {/* Accessibility section */}
      <div className="bg-gray-50 p-6 rounded-xl border">
        <h3 className="text-xl font-bold mb-4">Accessibility Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">✅ Always Use</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• WCAG AA contrast ratios</li>
              <li>• Color + icon/text combinations</li>
              <li>• High contrast mode support</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">❌ Never Use</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Color as the only indicator</li>
              <li>• Red/green only combinations</li>
              <li>• Low contrast text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const Typography = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Typography</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Clear, readable, and professional. Every word matters.
        </p>
      </div>

      <div className="space-y-8">
        {/* Headers */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-blue-900">Headers & Titles</h3>
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">H1: Main Titles</h1>
              <p className="text-sm text-gray-500">48px, Bold, Inter</p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">H2: Section Headers</h2>
              <p className="text-sm text-gray-500">36px, Bold, Inter</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">H3: Subsections</h3>
              <p className="text-sm text-gray-500">24px, Semibold, Inter</p>
            </div>
          </div>
        </div>

        {/* Body text */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-purple-900">Body Text</h3>
          <div className="space-y-4">
            <div>
              <p className="text-lg text-gray-900">Large body text for important content</p>
              <p className="text-sm text-gray-500">18px, Regular, Inter</p>
            </div>
            <div>
              <p className="text-base text-gray-700">Regular body text for general content</p>
              <p className="text-sm text-gray-500">16px, Regular, Inter</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Small text for captions and footnotes</p>
              <p className="text-xs text-gray-500">14px, Regular, Inter</p>
            </div>
          </div>
        </div>

        {/* Special text */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-green-900">Special Typography</h3>
          <div className="space-y-4">
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">Code and technical text</code>
              <p className="text-sm text-gray-500 mt-1">14px, Mono, JetBrains Mono</p>
            </div>
            <div>
              <p className="text-blue-600 font-semibold">Interactive elements and links</p>
              <p className="text-sm text-gray-500">16px, Semibold, Inter</p>
            </div>
            <div>
              <p className="text-red-600 font-medium">Error messages and warnings</p>
              <p className="text-sm text-gray-500">16px, Medium, Inter</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const BrandVoice = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Brand Voice</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Direct, helpful, and human. We say what we mean and mean what we say.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Voice characteristics */}
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3">We Are</h3>
            <ul className="text-blue-700 space-y-2">
              <li>✅ <strong>Direct:</strong> No fluff, clear communication</li>
              <li>✅ <strong>Helpful:</strong> Solution-focused and practical</li>
              <li>✅ <strong>Confident:</strong> We know our stuff</li>
              <li>✅ <strong>Human:</strong> Professional but approachable</li>
            </ul>
          </div>

          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <h3 className="font-bold text-red-900 mb-3">We Are Not</h3>
            <ul className="text-red-700 space-y-2">
              <li>❌ <strong>Overly casual:</strong> No excessive emojis</li>
              <li>❌ <strong>Jargony:</strong> Avoid unnecessary complexity</li>
              <li>❌ <strong>Pushy:</strong> Respect user autonomy</li>
              <li>❌ <strong>Fake:</strong> No performative enthusiasm</li>
            </ul>
          </div>
        </div>

        {/* Examples */}
        <div className="space-y-6">
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <h3 className="font-bold text-green-900 mb-3">✅ Good Examples</h3>
            <div className="space-y-3 text-green-700">
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">"Task completed. Your document is ready for review."</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">"This integration requires your Stripe API key. We'll walk you through it."</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">"Something went wrong. Here's what happened and how to fix it."</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
            <h3 className="font-bold text-orange-900 mb-3">❌ Avoid</h3>
            <div className="space-y-3 text-orange-700">
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">"Oops! 😅 Something super weird happened! 🤪"</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">"Utilize our revolutionary paradigm-shifting solution..."</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">"You absolutely MUST try this amazing feature!!!"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADHD-friendly guidelines */}
      <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
        <h3 className="font-bold text-purple-900 mb-4">ADHD & Spectrum-Friendly Communication</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-purple-800 mb-2">Structure</h4>
            <ul className="text-purple-700 text-sm space-y-1">
              <li>• Use clear headings and sections</li>
              <li>• Break up long paragraphs</li>
              <li>• Provide step-by-step instructions</li>
              <li>• Include progress indicators</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-purple-800 mb-2">Clarity</h4>
            <ul className="text-purple-700 text-sm space-y-1">
              <li>• Be explicit, avoid implications</li>
              <li>• Use active voice</li>
              <li>• Define technical terms</li>
              <li>• Provide context for actions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const ComponentMap = {
    BrandOverview,
    Emblem1,
    Emblem2,
    Emblem3,
    Emblem4,
    ColorSystem,
    Typography,
    BrandVoice
  };

  const CurrentComponent = ComponentMap[pages[currentPage].content];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold">Chitty Brand Bible</span>
            </div>
            <div className="text-sm text-gray-500">
              Page {currentPage + 1} of {pages.length}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-2">
          <div className="flex items-center space-x-1 overflow-x-auto">
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => setCurrentPage(index)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  currentPage === index
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page.icon}
                <span>{page.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div key={animationTrigger} className="animate-fade-in">
          <CurrentComponent />
        </div>
      </div>

      {/* Footer navigation */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            
            <div className="flex space-x-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentPage === index ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
              disabled={currentPage === pages.length - 1}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ChittyBrandGuidelines;