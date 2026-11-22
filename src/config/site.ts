export const siteConfig = {
  name: "Lachlan Campbell",
  handle: "Doxxus",
  tagline: "Software architect · Drum & Bass enjoyer · Technological Tinkerer",
  url: "https://doxxus.ca",
  // Each string is rendered as its own paragraph in the About section on the home page
  about: [
    "Hi! Welcome to my personal site. A place where I can share some cool stuff I've made. Feel free to explore my projects, mixes, and more.",
  ],
  links: [
    { label: "GitHub", href: "https://github.com/Doxxus" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/lachlan-campbell-doxxus/",
    },
    { label: "Email", href: "mailto:lachlan@doxxus.ca" },
  ],
} as const;

/**
 * Cards shown on the home page. Add an entry here (and a rewrite in `next.config.js` if the page
 * lives in another project) to add a new page to the site.
 */
export const pages = [
  {
    title: "Portfolio",
    description: "Projects, experience and skills, plus an interactive résumé.",
    href: "/portfolio",
  },
  {
    title: "Mixes",
    description: "Drum & bass mixes with live tracklists.",
    href: "/mixes",
  },
] as const;
