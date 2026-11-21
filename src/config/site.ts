export const siteConfig = {
  name: "Lachlan Campbell",
  handle: "Doxxus",
  tagline: "Software developer · Drum & bass selector",
  url: "https://doxxus.ca",
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
