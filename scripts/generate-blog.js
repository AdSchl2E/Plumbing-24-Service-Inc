const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');

// Chemins des répertoires
const sourceDir = path.join(__dirname, '../_blog');
const outputDir = path.join(__dirname, '../blogs');
const templatesDir = path.join(__dirname, '../_templates');

// S'assurer que le répertoire de sortie existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Charger les templates
const postTemplate = fs.readFileSync(path.join(templatesDir, 'blog-post.html'), 'utf8');
const indexTemplate = fs.readFileSync(path.join(templatesDir, 'blog-index.html'), 'utf8');

// Analyser tous les fichiers Markdown dans le répertoire source
const posts = [];
fs.readdirSync(sourceDir).forEach(filename => {
  if (!filename.endsWith('.md')) return;
  
  const filePath = path.join(sourceDir, filename);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  
  const htmlContent = marked(content);
  
  // Générer le HTML de l'article
  let postHtml = postTemplate
    .replace(/{{title}}/g, data.title)
    .replace(/{{date}}/g, data.date)
    .replace(/{{author}}/g, data.author)
    .replace(/{{category}}/g, data.category)
    .replace(/{{image}}/g, data.image)
    .replace(/{{content}}/g, htmlContent);
  
  // Écrire le fichier HTML de l'article
  const outputPath = path.join(outputDir, `${data.slug}.html`);
  fs.writeFileSync(outputPath, postHtml);
  
  // Ajouter à la liste pour l'index
  posts.push({
    title: data.title,
    slug: data.slug,
    date: data.date,
    author: data.author,
    category: data.category,
    image: data.image,
    excerpt: data.excerpt
  });
});

// Trier les posts par date (plus récent en premier)
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Générer le HTML pour les cartes d'articles
let blogCards = '';
posts.forEach(post => {
  blogCards += `
  <div class="bg-white rounded-lg shadow-md overflow-hidden transition duration-300 hover:shadow-lg">
    <div class="h-48 overflow-hidden">
      <img src="img/blog/${post.image}" alt="${post.title}" title="${post.title}" class="w-full h-full object-cover">
    </div>
    <div class="p-6">
      <div class="flex items-center text-sm text-gray-500 mb-2">
        <span>${post.date}</span>
        <span class="mx-2">•</span>
        <span>${post.category}</span>
      </div>
      <h3 class="text-xl font-bold text-blue-800 mb-3">${post.title}</h3>
      <p class="text-gray-600 mb-4">${post.excerpt}</p>
      <a href="blogs/${post.slug}.html" title="Read Full Article" class="text-blue-600 font-medium hover:underline">
        Read More
      </a>
    </div>
  </div>`;
});

// Générer la page d'index des blogs
let indexHtml = indexTemplate.replace('{{blogCards}}', blogCards);
fs.writeFileSync(path.join(__dirname, '../blogs.html'), indexHtml);

console.log(`Generated ${posts.length} blog posts and index page.`);