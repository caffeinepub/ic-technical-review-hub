import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-muted-foreground">
          © 2025. Built with{" "}
          <Heart className="inline h-4 w-4 text-red-500 fill-red-500 animate-pulse" />{" "}
          using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary font-semibold transition-colors duration-200"
          >
            caffeine.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
