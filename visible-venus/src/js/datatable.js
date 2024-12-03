var dataSet = [
    ["10005", "Halo Online", "Halo", "301", "291", "0.97", "Sloppy", "4", "Comic with occasional mix of sprites and memes. Group comic", "/jeevespage?comic_id=10005"],
["10065", "SoniX", "Sonic", "10", "10", "1", "Questioned my sanity archiving this", "0", "Pretty much only put this here cause it had Sonic in it", "/jeevespage?comic_id=10065"],
["10070", "RuneScape Misadventures", "Random", "20", "20", "1", "For historical purposes only", "1", "Runescape", "/jeevespage?comic_id=10070"],
["10185", "Authortastic 2.0", "Sonic", "301", "283", "0.94", "Sloppy", "4", "Looks like a group comic, so quality flactuates. Has interesting character designs (mostly recolors lol) though and the authors seem to get better over time.", "/jeevespage?comic_id=10185"],
["10203", "What Ever Sprite Comic", "Sonic", "7", "7", "1", "Solid title", "8", "Comic tutorials by YoshiRyu, so this is a gem", "/jeevespage?comic_id=10203"],
["10208", "Mission Complete", "Mixed", "28", "28", "1", "Nothing to write home about", "3", "Starfox with a mix of Mario and other characters.", "/jeevespage?comic_id=10208"],
["10224", "No Bgs ReNew'd!", "Sonic", "111", "107", "0.96", "Interesting", "6", "Mix of decent and horrible. Comics posted are decent, with a mix of memes. Higher rating since it has screenshots with historical value (See chapter 107)", "/jeevespage?comic_id=10224"],
["10413", "Sonic Realities", "Sonic", "6", "6", "1", "Nothing to write home about", "3", "Pretty short fan character comic", "/jeevespage?comic_id=10413"],
["10506", "My Old Comic", "Sonic", "38", "33", "0.87", "Not worth reading", "2", "Sally was a slut. Page 3. LOL", "/jeevespage?comic_id=10506"],
["10514", "The Mind of sc276", "Sonic", "122", "120", "0.98", "For historical purposes only", "1", "Quality is kinda yuck but seems interesting", "/jeevespage?comic_id=10514"],
["10676", "The Three of Chaos", "Sonic", "17", "10", "0.59", "For historical purposes only", "1", "Missing half the pages", "/jeevespage?comic_id=10676"],
["62037", "Dead Indeed", "Sonic", "83", "80", "0.96", "Classic Status", "10", "Dead Indeed", "/jeevespage?comic_id=62037"],
["100034", "A New Adventure", "Sonic", "8", "8", "1", "Nothing to write home about", "3", "Some OC comic. Neat sprites", "/jeevespage?comic_id=100034"],


];

var table = $('#example').DataTable({
    columns: [
        { title: 'Comic #'},
        { title: 'Title' },
        { title: 'Category'},
        { title: 'Pages in Metadata' },
        { title: 'Pages in Folder' },
        { title: 'Percent Saved' },
        { title: 'Quality' },
        { title: 'Rating' },
        { title: 'Xypter\'s Notes: ', className: 'none'},
        { 
            title: 'Link: ', 
            className: 'none',
            render: function(data, type, row) {
                // Ensure data contains the link
                return `<a href="${data}" target="_blank">View Comic</a>`;
            }
        }
        
    ],
    columnDefs: [
        {
            searchPanes: {
                show: true
            },
            targets: [2]
        },
        {
            searchPanes: {
                show: false
            },
            targets: [5]
        },
        {
            searchPanes: {
                show: true
            },
            targets: [6]
        },
        {
            searchPanes: {
                show: true
            },
            targets: [7]
        },
        {
            targets: 5, // Index of the column to format
            render: function (data, type, row) {
                // Multiply by 100 and append a percentage symbol
                return (parseFloat(data) * 100).toFixed(0) + '%';
            }
        }
    ],
    data: dataSet,
    layout: {
        topStart: 'searchPanes'
    },
    
    responsive: true,
    dom: 'Pfrtip'
});






