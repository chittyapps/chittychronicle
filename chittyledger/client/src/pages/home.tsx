import HeroSection from "@/components/hero-section";
import TechStack from "@/components/tech-stack";
import { Scale } from "lucide-react";

export default function Home() {
  return (
    <div>
      <HeroSection />
      
      {/* Elite Footer */}
      <footer className="py-20 bg-obsidian-complex border-t border-gold-byzantium-500/20">
        <div className="container mx-auto px-8">
          <div className="glass-obsidian rounded-2xl p-12">
            <div className="grid grid-cols-12 gap-12">
              <div className="col-span-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="legal-seal-premium w-12 h-12 rounded-full flex items-center justify-center">
                    <Scale className="w-6 h-6 text-obsidian-950" />
                  </div>
                  <div>
                    <div className="font-legal text-2xl text-gradient-byzantium">ChittyChain</div>
                    <div className="font-tech text-sm text-gold-byzantium-500">Evidence Ledger</div>
                  </div>
                </div>
                
                <p className="text-obsidian-300 max-w-md font-crimson leading-relaxed mb-8">
                  Revolutionary blockchain-based evidence management with cryptographic validation, 
                  ensuring court-admissible documentation and immutable chain of custody.
                </p>
                
                <div className="glass-byzantium rounded-xl p-4 inline-block">
                  <span className="text-sm text-obsidian-950 font-tech tracking-wide">© 2024 ChittyOS Legal Technology Suite</span>
                </div>
              </div>
              
              <div className="col-span-6">
                <div className="mb-8">
                  <TechStack />
                </div>
                
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h4 className="font-legal text-lg text-obsidian-100 mb-6">Platform</h4>
                    <ul className="space-y-3 text-sm text-obsidian-400">
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Evidence Upload</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Chain Verification</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Contradiction Detection</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Notion Integration</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-legal text-lg text-obsidian-100 mb-6">Legal</h4>
                    <ul className="space-y-3 text-sm text-obsidian-400">
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Court Admissibility</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Privacy Policy</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Terms of Service</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Compliance</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-legal text-lg text-obsidian-100 mb-6">Support</h4>
                    <ul className="space-y-3 text-sm text-obsidian-400">
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Documentation</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">API Reference</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Contact</a></li>
                      <li><a href="#" className="hover:text-gold-byzantium-500 transition-colors font-crimson">Status</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
