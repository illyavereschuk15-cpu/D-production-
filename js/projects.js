// ---------- projects (replace with real ones) ----------
window.DK = window.DK || {};
(function(){
  var MODES = [
    { id:'automotive', label:'Automotive' },
    { id:'short', label:'Short film' },
    { id:'image', label:'Image films' },
    { id:'events', label:'Events' },
    { id:'about', label:'About me' }
  ];
  var projects = [
    { title:"Night run", mode:"automotive", cat:"Automotive", year:"2026", still:"s-auto1", role:"Direction, camera, edit, colour", client:"Private client", text:"A night drive through Munich, lit only by the city. Placeholder: describe the brief and what made this shoot special." },
    { title:"Tail lights", mode:"automotive", cat:"Automotive", year:"2025", still:"s-auto2", role:"Cinematography", client:"Add client", text:"Placeholder: one or two sentences about the task and your role." },
    { title:"Garage session", mode:"automotive", cat:"Automotive", year:"2024", still:"s-auto3", role:"Camera, colour", client:"Private client", text:"Placeholder text for another automotive film." },
    { title:"Short film", mode:"short", cat:"Short film", year:"2025", still:"s-short1", role:"Director of photography", client:"Macromedia University", text:"Placeholder: logline and your role." },
    { title:"Second short", mode:"short", cat:"Short film", year:"2024", still:"s-short2", role:"Camera, edit", client:"Student production", text:"Placeholder text for a second short film." },
    { title:"Image film", mode:"image", cat:"Image film", year:"2025", still:"s-image1", role:"Full production", client:"Add client", text:"Placeholder: who it was for and what it had to show." },
    { title:"Event film", mode:"events", cat:"Event", year:"2025", still:"s-wed1", role:"Camera, edit", client:"Private", text:"Placeholder text for an event film." }
  ];
  var ABOUT_HTML = '<div class="about-pane"><div class="portrait" role="img" aria-label="Portrait placeholder"><span>Portrait placeholder</span></div><div>' +
    '<h2 class="display">About me</h2>' +
    '<p class="lead">I\'m Illia Vereshchuk, a director and cinematographer based in Munich. Darkinsider is the name I work under.</p>' +
    '<p>Most of my work happens around cars, often at night, when the city becomes a set. Alongside that I make short films, image films and event films for people who want their story told like cinema.</p>' +
    '<p>I study Filmmaking at Macromedia University of Applied Sciences in Munich and take on freelance projects across Germany and abroad.</p>' +
    '<dl class="roll"><dt>Directed by</dt><dd>Illia Vereshchuk</dd><dt>Director of photography</dt><dd>Illia Vereshchuk</dd><dt>Edited by</dt><dd>Illia Vereshchuk</dd><dt>Colour</dt><dd>Illia Vereshchuk</dd></dl>' +
    '<a class="tlink" href="#finale"><span>Start a project</span></a></div></div>';
  DK.MODES = MODES; DK.projects = projects; DK.ABOUT_HTML = ABOUT_HTML;
})();
