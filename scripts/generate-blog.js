const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// Paths
const sourceDir = path.join(__dirname, '../_blog');
const outputDir = path.join(__dirname, '../blogs');
const templatesDir = path.join(__dirname, '../_templates');

// Make sure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Load blog template
const blogTemplate = fs.readFileSync(path.join(templatesDir, 'blog-post.html'), 'utf8');
const indexTemplate = fs.readFileSync(path.join(templatesDir, 'blog-index.html'), 'utf8');

// Function to get random related articles (excluding current one)
const getRelatedArticles = (allPosts, currentSlug, count = 3) => {
  const filteredPosts = allPosts.filter(post => post.slug !== currentSlug);
  // Shuffle and take the first 'count' posts
  return filteredPosts.sort(() => 0.5 - Math.random()).slice(0, Math.min(count, filteredPosts.length));
};

// Process all Markdown files
const posts = [];
const fileMap = {}; // Map slugs to filenames

fs.readdirSync(sourceDir).forEach(filename => {
  if (!filename.endsWith('.md')) return;

  const filePath = path.join(sourceDir, filename);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  // Check if image exists, regardless if it was specified or not
  if (data.image) {
    // If image is specified, verify it exists
    const specifiedImagePath = path.join(__dirname, '../img/blog', data.image);
    if (!fs.existsSync(specifiedImagePath)) {
      // If specified image doesn't exist, fall back to default
      console.log(`Warning: Image ${data.image} not found for ${data.title}, using default`);
      data.image = 'default-plumbing.webp';
    }
  } else {
    // No image specified, try using slug as filename
    data.image = `${data.slug}.webp`;
    
    // Check if slug-named image exists
    const slugImagePath = path.join(__dirname, '../img/blog', data.image);
    if (!fs.existsSync(slugImagePath)) {
      console.log(`No image found for ${data.title}, using default`);
      data.image = 'default-plumbing.webp';
    }
  }

  // Store filename by slug for later use
  fileMap[data.slug] = filename;

  // Add to posts list for indexing and related articles
  posts.push({
    title: data.title,
    slug: data.slug,
    date: data.date,
    author: data.author || 'John Miller',
    category: data.category,
    image: data.image,
    excerpt: data.excerpt,
    readTime: data.readTime || 5
  });
});

// Sort posts by date (newest first)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Generate HTML for each post
posts.forEach(post => {
  // Find the markdown file for this post using our map
  const filename = fileMap[post.slug];
  if (!filename) {
    console.warn(`No markdown file found for post with slug: ${post.slug}`);
    return;
  }

  const filePath = path.join(sourceDir, filename);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  // Extract headings for table of contents - FIX: don't duplicate IDs
  const headings = [];
  let contentWithIds = content.replace(/^## (.*$)/gm, (match, heading) => {
    const id = heading.toLowerCase().replace(/[^\w]+/g, '-');
    headings.push({ title: heading, id });
    // Don't add the ID in the heading - we'll add it correctly in the HTML
    return `## ${heading}`;
  });

  // Convert Markdown to HTML
  let htmlContent = marked(contentWithIds);

  // Enhance bullet point styling
  htmlContent = htmlContent.replace(
    /<ul>/g,
    '<ul class="my-6 pl-6 list-none space-y-2">'
  ).replace(
    /<li>/g,
    '<li class="flex items-start"><span class="inline-block w-3 h-3 mr-2 mt-1.5 rounded-full bg-blue-700 flex-shrink-0"></span><span>'
  ).replace(
    /<\/li>/g,
    '</span></li>'
  );

  // Split content into sections
  const sections = htmlContent.split('<h2');

  // Extract introduction (content before first h2)
  const introduction = sections[0];

  // Generate table of contents HTML
  let tableOfContents = '';
  headings.forEach(heading => {
    tableOfContents += `<li><a href="#${heading.id}" class="hover:underline">${heading.title}</a></li>\n`;
  });
  if (headings.length > 0) {
    tableOfContents += `<li><a href="#conclusion" class="hover:underline">Conclusion</a></li>`;
  }

  // Format sections
  let formattedSections = '';
  let conclusion = '';
  let tipContent = '';

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const titleMatch = section.match(/>(.*?)<\/h2>/);

    if (titleMatch) {
      const title = titleMatch[1];
      const id = title.toLowerCase().replace(/[^\w]+/g, '-');

      // Check if this is a professional tip section
      if (title.toLowerCase().includes('professional') && title.toLowerCase().includes('tip')) {
        tipContent = section.replace(/.*?<\/h2>/, '').trim();
        continue;
      }

      // Check if this is the conclusion
      if (id === 'conclusion' || title.toLowerCase() === 'conclusion') {
        conclusion = section.replace(/.*?<\/h2>/, '').trim();
        continue;
      }

      // Only add non-empty sections
      if (section.replace(/.*?<\/h2>/, '').trim().length > 0) {
        // Regular section - Add proper ID to the h2 tag
        // IMPORTANT: Don't wrap section content in <p> tags, preserve HTML as-is
        formattedSections += `
        <h2 id="${id}" class="text-2xl font-bold text-blue-800 mt-8 mb-4">${title}</h2>
        ${section.replace(/.*?<\/h2>/, '')}`;
      }
    }
  }

  // If no explicit conclusion, create a generic one
  if (!conclusion && sections.length > 1) {
    conclusion = `<p>Your water heater is a crucial component of your plumbing system. By staying vigilant about these warning signs and addressing issues promptly, you can avoid costly emergency repairs and ensure consistent hot water for your home. If you notice any of these signs, don't hesitate to contact our professional plumbers at Plumbing 24 Service Inc for expert assistance.</p>`;
  }

  // If no professional tip, create a generic one
  if (!tipContent) {
    tipContent = `<p>Consider flushing your water heater annually to remove sediment buildup. This simple maintenance step can significantly extend the life of your unit and improve energy efficiency. For homes with hard water in Miami, we recommend installing a water softener to reduce mineral deposits and protect all your plumbing fixtures, not just your water heater.</p>`;
  }

  // Get related articles
  const relatedArticles = getRelatedArticles(posts, post.slug);

  // Format date nicely
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Replace template placeholders with English content
  let postHtml = blogTemplate
    // Fix title and meta tags
    .replace(/ARTICLE_TITLE/g, `${post.title}`)
    .replace(/alt="ARTICLE_TITLE"/g, `alt="${post.title}"`)
    .replace(/<h1 class="text-3xl font-bold text-blue-800 mb-4">ARTICLE<\/_TITLEh1>/g,
      `<h1 class="text-3xl font-bold text-blue-800 mb-4">${post.title}</h1>`)

    // Standard placeholder replacements
    .replace(/ARTICLE_DESCRIPTION/g, post.excerpt)
    .replace(/FEATURED_IMAGE/g, post.image)
    .replace(/CATEGORY/g, post.category)
    .replace(/PUBLISHED_DATE/g, formattedDate)
    .replace(/READ_TIME/g, post.readTime)
    .replace(/AUTHOR/g, post.author)
    .replace(/INTRODUCTION/g, introduction)

    // Table of contents
    .replace(/<ul class="space-y-1 text-blue-600">[\s\S]*?<\/ul>/s, `<ul class="space-y-1 text-blue-600">\n${tableOfContents}\n</ul>`)

    // IMPORTANT: Replace all section placeholders with dynamic content
    .replace(/<!-- Section 1 -->[\s\S]*?<!-- Section 4 -->/s, formattedSections)

    // Remove any remaining empty sections (with their heading and content)
    .replace(/<h2 id="section[1-4]"[^>]*>SECTION_[1-4]<\/h2>\s*<p>SECTION_[1-4]_CONTENT<\/p>/g, '')
    .replace(/<h2 id="section[1-4]"[^>]*>SECTION_[1-4]<\/h2>\s*<p>_CONTENT<\/p>/g, '')
    .replace(/<h2 id="section[1-4]"[^>]*>[^<]*<\/h2>\s*<p>[^<]*<\/p>/g, '')

    // Fix the tip content placeholder - CRITICAL FIX
    .replace(/COUNSEL_PRO/g, tipContent)

    // Fix the conclusion content placeholder
    .replace(/CONCLUSION_CONTENT/g, conclusion);

  // 2. Handle Related Articles section - completely remove it if empty
  if (relatedArticles.length === 0) {
    // Remove the entire related articles section if there are no articles to show
    postHtml = postHtml.replace(
      /<section class="py-12 bg-gray-50">\s*<div class="container mx-auto px-4">\s*<div class="max-w-5xl mx-auto">\s*<h2[^>]*>Related Articles<\/h2>\s*<div class="grid[^>]*>.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/s,
      ''
    );
  } else {
    // Add related articles
    let relatedStr = '';
    for (let i = 0; i < relatedArticles.length; i++) {
      const related = relatedArticles[i];
      relatedStr += `
      <div class="bg-white rounded-lg shadow-md overflow-hidden transition duration-300 hover:shadow-lg">
        <a href="${related.slug}.html" class="block">
          <div class="h-48 overflow-hidden">
            <img src="../img/blog/${related.image}" 
              alt="${related.title}" 
              class="w-full h-full object-cover transform hover:scale-105 transition duration-300">
          </div>
        </a>
        <div class="p-4">
          <a href="${related.slug}.html" class="block">
            <h3 class="font-bold text-blue-800 mb-2 hover:text-blue-600 transition">${related.title}</h3>
          </a>
          <p class="text-gray-600 text-sm mb-2">${related.excerpt.substring(0, 80)}...</p>
          <a href="${related.slug}.html" class="text-blue-600 hover:underline text-sm" 
             aria-label="Read full article about ${related.title.toLowerCase()}">Read about ${related.title.toLowerCase().substring(0, 30)}${related.title.length > 30 ? '...' : ''}</a>
        </div>
      </div>`;
    }

    // Replace related articles section with non-empty content
    try {
      postHtml = postHtml.replace(
        /<div class="grid grid-cols-1 md:grid-cols-3 gap-8">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/s,
        `<div class="grid grid-cols-1 md:grid-cols-3 gap-8">${relatedStr}</div></div></div></section>`
      );
    } catch (e) {
      console.log("Using fallback for related articles");
      const relatedSectionStart = postHtml.indexOf('<h2 class="text-2xl font-bold text-blue-800 mb-8 text-center">Related Articles</h2>');
      if (relatedSectionStart !== -1) {
        const gridStart = postHtml.indexOf('<div class="grid', relatedSectionStart);
        const gridEnd = postHtml.indexOf('</div></div></div></section>', gridStart) + 30;

        if (gridStart !== -1 && gridEnd !== -1) {
          const before = postHtml.substring(0, gridStart);
          const after = postHtml.substring(gridEnd);
          postHtml = before + `<div class="grid grid-cols-1 md:grid-cols-3 gap-8">${relatedStr}</div></div></div></section>` + after;
        }
      }
    }
  }

  // Also cleanup remaining section placeholders by removing the whole section element
  // This catches any format not caught by previous replacements
  for (let i = 1; i <= 4; i++) {
    // This will remove any section that still contains placeholder text
    const sectionRegex = new RegExp(`<h2[^>]*>SECTION_${i}<\/h2>\\s*<p>SECTION_${i}_CONTENT<\/p>`, 'g');
    postHtml = postHtml.replace(sectionRegex, '');
  }

  // Write the generated HTML file
  const outputPath = path.join(outputDir, `${post.slug}.html`);
  fs.writeFileSync(outputPath, postHtml);
  console.log(`Generated: ${outputPath}`);
});

// Extract unique categories for filtering
const categories = [...new Set(posts.map(post => post.category))].sort();

// Generate HTML for category filter buttons
let categoryButtonsHtml = '';
categories.forEach(category => {
  categoryButtonsHtml += `
    <button class="category-filter bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition" data-category="${category}">
        ${category}
    </button>
  `;
});

// Generate HTML for each post with data-category attribute
let blogCards = '';
posts.forEach(post => {
  // Format the date nicely
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  blogCards += `
  <div class="blog-card bg-white rounded-lg shadow-md overflow-hidden transition duration-300 hover:shadow-lg" data-category="${post.category}">
    <a href="blogs/${post.slug}.html" class="block" aria-label="Read article: ${post.title}">
      <div class="h-48 overflow-hidden">
        <img src="img/blog/${post.image}" 
          alt="${post.title}" 
          title="${post.title}" 
          class="w-full h-full object-cover transform hover:scale-105 transition duration-300">
      </div>
    </a>
    <div class="p-6">
      <div class="flex items-center text-sm text-gray-500 mb-3">
        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">${post.category}</span>
        <span class="mx-2">•</span>
        <span>${formattedDate}</span>
      </div>
      <a href="blogs/${post.slug}.html" class="block">
        <h3 class="text-xl font-bold text-blue-800 mb-3 hover:text-blue-600 transition">${post.title}</h3>
      </a>
      <p class="text-gray-600 mb-4">${post.excerpt}</p>
      <div class="flex items-center justify-between">
        <a href="blogs/${post.slug}.html" class="text-blue-600 font-medium hover:underline" 
           aria-label="Read full article about ${post.title.toLowerCase()}">
          Read about ${post.title.toLowerCase().substring(0, 20)}${post.title.length > 20 ? '...' : ''} <i class="fas fa-arrow-right ml-1 text-sm"></i>
        </a>
        <span class="text-sm text-gray-500">${post.readTime} min read</span>
      </div>
    </div>
  </div>`;
});

// Generate blog index page
if (fs.existsSync(path.join(templatesDir, 'blog-index.html'))) {
  const indexHtml = indexTemplate
    .replace('{{blogCards}}', blogCards)
    .replace('{{categoryButtons}}', categoryButtonsHtml);
  fs.writeFileSync(path.join(__dirname, '../blogs.html'), indexHtml);
  console.log(`Generated: blogs.html`);
}

// Generate blog section for the home page (index.html)
const homePageBlogSection = () => {
  // Get only the most recent 3 posts
  const recentPosts = posts.slice(0, 3);
  let homeBlogCards = '';

  recentPosts.forEach(post => {
    const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    homeBlogCards += `
          <!-- Blog Post -->
          <div class="blog-card bg-white rounded-lg shadow-md overflow-hidden transition duration-300 hover:shadow-lg" data-category="${post.category}">
    <a href="blogs/${post.slug}.html" class="block" aria-label="Read article: ${post.title}">
      <div class="h-48 overflow-hidden">
        <img src="img/blog/${post.image}" 
          alt="${post.title}" 
          title="${post.title}" 
          class="w-full h-full object-cover transform hover:scale-105 transition duration-300">
      </div>
    </a>
    <div class="p-6">
      <div class="flex items-center text-sm text-gray-500 mb-3">
        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">${post.category}</span>
        <span class="mx-2">•</span>
        <span>${formattedDate}</span>
      </div>
      <a href="blogs/${post.slug}.html" class="block">
        <h3 class="text-xl font-bold text-blue-800 mb-3 hover:text-blue-600 transition">${post.title}</h3>
      </a>
      <p class="text-gray-600 mb-4">${post.excerpt}</p>
      <div class="flex items-center justify-between">
        <a href="blogs/${post.slug}.html" class="text-blue-600 font-medium hover:underline"
           aria-label="Learn more about ${post.title.toLowerCase()}">
          Learn about ${post.category} tips <i class="fas fa-arrow-right ml-1 text-sm"></i>
        </a>
        <span class="text-sm text-gray-500">${post.readTime} min read</span>
      </div>
    </div>
  </div>`;
  });

  homeBlogCards += `</div>`;

  return homeBlogCards;
};

// Update the blog section in index.html
try {
  const indexPath = path.join(__dirname, '../index.html');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');

    // Find the blog section specifically using the id="blog" attribute
    const blogSectionStart = indexContent.indexOf('<section id="blog"');

    if (blogSectionStart !== -1) {
      // Find the grid container inside the blog section
      const gridStart = indexContent.indexOf('<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">', blogSectionStart);

      if (gridStart !== -1) {
        // Find where the grid ends and the "View All Articles" section begins
        const gridEnd = indexContent.indexOf('<div class="text-center mt-10">', gridStart);

        if (gridEnd !== -1) {
          // Extract the part before the grid content
          const beforeGrid = indexContent.substring(0, gridStart + '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">'.length);

          // Extract the part after the grid content
          const afterGrid = indexContent.substring(gridEnd);

          // Generate the new blog posts HTML
          const updatedContent = beforeGrid + '\n' + homePageBlogSection() + '\n        ' + afterGrid;

          fs.writeFileSync(indexPath, updatedContent);
          console.log(`Updated blog section in index.html`);
        } else {
          console.warn('Could not find the end of the grid in blog section');
        }
      } else {
        console.warn('Could not find grid container in blog section');
      }
    } else {
      console.warn('Could not find blog section with id="blog" in index.html');
    }
  }
} catch (err) {
  console.error('Error updating index.html:', err);
}

// Generate sitemap
console.log('Generating sitemap.xml...');
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>https://plumbing24serviceinc.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main Pages -->  
  <url>
    <loc>https://plumbing24serviceinc.com/blogs.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

// Add all blog posts to sitemap
posts.forEach(post => {
  const postDate = new Date(post.date).toISOString().split('T')[0];
  sitemapContent += `  
  <url>
    <loc>https://plumbing24serviceinc.com/blogs/${post.slug}.html</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>
`;
});

// Add service pages (static)
const servicePages = [
  'emergency-plumbing', 
  'drain-cleaning',
  'water-heater-services', 
  'toilet-repair',
  'pipe-repair',
  'commercial-plumbing'
];

servicePages.forEach(service => {
  sitemapContent += `  
  <url>
    <loc>https://plumbing24serviceinc.com/services/${service}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

sitemapContent += `</urlset>`;

// Write sitemap to file
fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemapContent);
console.log('Sitemap generated successfully!');
