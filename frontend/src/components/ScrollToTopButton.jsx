import { useEffect, useState } from "react";

export default function ScrollToTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            setVisible(window.scrollY > 300);
        };

        toggleVisibility();

        window.addEventListener("scroll", toggleVisibility);

        return () => {
            window.removeEventListener("scroll", toggleVisibility);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <button
            aria-label="Scroll to top"
            onClick={scrollToTop}
            className={`
                    fixed bottom-8 right-8 
                    flex h-12 w-12 items-center justify-center
                    rounded-full
                    bg-[#0F0E0C] text-white
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    hover:scale-105
                    ${visible
                    ? "opacity-100 visible"
                    : "opacity-0 invisible"
                }
            `}
        >
            ↑
        </button>
    );
}