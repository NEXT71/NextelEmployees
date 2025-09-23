import { TrendingUp } from "lucide-react";

const StatsCard = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    green: 'from-blue-400 to-purple-500 text-blue-300',
    red: 'from-red-400 to-pink-500 text-red-300',
    blue: 'from-indigo-400 to-blue-500 text-indigo-300',
    purple: 'from-purple-400 to-indigo-500 text-purple-300',
    yellow: 'from-yellow-400 to-orange-500 text-yellow-300'
  };

  return (
    <div className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 relative">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-r ${colorClasses[color]} bg-opacity-10 backdrop-blur-sm`}>
            <div className={`${(colorClasses[color] || "").split(' ')[2]}`}>
              {icon}
            </div>
          </div>
          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="space-y-1">
          <p className="text-xs sm:text-sm text-blue-200/70 font-medium">{title}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">{value}</p>
          {subtitle && <p className="text-xs text-blue-300/60">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;