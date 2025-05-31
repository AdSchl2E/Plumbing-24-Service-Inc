// Accordion functionality
document.querySelectorAll('.accordion-btn').forEach(button => {
    button.addEventListener('click', () => {
        const accordionContent = button.nextElementSibling;
        const icon = button.querySelector('i');

        button.classList.toggle('active');
        accordionContent.classList.toggle('active');

        if (button.classList.contains('active')) {
            icon.classList.remove('fa-plus');
            icon.classList.add('fa-minus');
        } else {
            icon.classList.remove('fa-minus');
            icon.classList.add('fa-plus');
        }
    });
});

// Mobile Menu Toggle Functionality
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');

    // Change icon based on menu state
    const icon = mobileMenuButton.querySelector('i');
    if (mobileMenu.classList.contains('hidden')) {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    } else {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    }
});

// Close mobile menu when clicking on a link
document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        const icon = mobileMenuButton.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    });
});

// Back to Top Button functionality
const backToTopBtn = document.getElementById('back-to-top');

// Show/hide button based on scroll position
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopBtn.classList.remove('scale-0', 'opacity-0');
        backToTopBtn.classList.add('scale-100', 'opacity-100');
    } else {
        backToTopBtn.classList.remove('scale-100', 'opacity-100');
        backToTopBtn.classList.add('scale-0', 'opacity-0');
    }
});

// Scroll to top with smooth behavior when button is clicked
backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Mobile Call Button functionality
const mobileCallBtn = document.getElementById('mobile-call-button');

// Only show on mobile devices
if (window.innerWidth < 768) {
    mobileCallBtn.classList.remove('hidden');
}

// Update visibility on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
        mobileCallBtn.classList.remove('hidden');
    } else {
        mobileCallBtn.classList.add('hidden');
    }
});
