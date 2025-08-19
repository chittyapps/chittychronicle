import { 
  SiReact, 
  SiTypescript, 
  SiVite, 
  SiTailwindcss, 
  SiExpress, 
  SiNodedotjs,
  SiPostgresql,
  SiFramer
} from "react-icons/si";

export default function TechStack() {
  const technologies = [
    { 
      icon: SiReact, 
      name: "React", 
      color: "text-blue-400",
      category: "Frontend"
    },
    { 
      icon: SiTypescript, 
      name: "TypeScript", 
      color: "text-blue-500",
      category: "Language"
    },
    { 
      icon: SiVite, 
      name: "Vite", 
      color: "text-purple-400",
      category: "Build Tool"
    },
    { 
      icon: SiTailwindcss, 
      name: "Tailwind CSS", 
      color: "text-cyan-400",
      category: "Styling"
    },
    { 
      icon: SiNodedotjs, 
      name: "Node.js", 
      color: "text-green-400",
      category: "Runtime"
    },
    { 
      icon: SiExpress, 
      name: "Express", 
      color: "text-gray-400",
      category: "Backend"
    },
    { 
      icon: SiPostgresql, 
      name: "PostgreSQL", 
      color: "text-blue-600",
      category: "Database"
    },
    { 
      icon: SiFramer, 
      name: "Framer Motion", 
      color: "text-pink-400",
      category: "Animation"
    }
  ];

  return (
    <div className="bg-slate-800/30 border border-slate-600 rounded-xl p-6">
      <h3 className="text-white font-semibold text-lg mb-6 text-center">
        Built with Modern Technologies
      </h3>
      
      <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
        {technologies.map((tech, index) => {
          const Icon = tech.icon;
          return (
            <div 
              key={index}
              className="group flex flex-col items-center cursor-pointer"
              data-testid={`tech-${tech.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className={`
                w-12 h-12 rounded-lg border-2 border-slate-600 bg-slate-800/50 
                flex items-center justify-center transition-all duration-300
                group-hover:border-slate-400 group-hover:bg-slate-700/50
                group-hover:scale-110
              `}>
                <Icon className={`w-6 h-6 ${tech.color} transition-colors duration-300`} />
              </div>
              
              {/* Tooltip */}
              <div className={`
                absolute mt-16 bg-slate-700 rounded-lg px-3 py-2 border border-slate-500
                opacity-0 group-hover:opacity-100 transition-opacity duration-300
                pointer-events-none whitespace-nowrap z-50 text-center
              `}>
                <span className="text-sm text-white font-medium">{tech.name}</span>
                <div className="text-xs text-slate-300">{tech.category}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-slate-400 text-sm">
          Hover over the icons to see the technology details
        </p>
      </div>
    </div>
  );
}