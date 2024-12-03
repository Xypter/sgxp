var dataSet = [
    ["10005", "Halo Online", "Halo", "301", "291", "0.97", "Nothing to write home about", "4", "Comic with occasional mix of sprites and memes. Group comic", "/jeevespage?comic_id=10005"],
["10065", "SoniX", "Sonic", "10", "10", "1", "Questioned my sanity archiving this", "0", "Pretty much only put this here cause it had Sonic in it", "/jeevespage?comic_id=10065"],
["10070", "RuneScape Misadventures", "Random", "20", "20", "1", "For historical purposes only", "1", "Runescape", "/jeevespage?comic_id=10070"],
["10185", "Authortastic 2.0", "Sonic", "301", "283", "0.94", "Nothing to write home about", "4", "Looks like a group comic, so quality flactuates. Has interesting character designs (mostly recolors lol) though and the authors seem to get better over time.", "/jeevespage?comic_id=10185"],
["10203", "What Ever Sprite Comic", "Sonic", "7", "7", "1", "Solid title", "8", "Comic tutorials by YoshiRyu, so this is a gem", "/jeevespage?comic_id=10203"],
["10208", "Mission Complete", "Mixed", "28", "28", "1", "Sloppy", "3", "Starfox with a mix of Mario and other characters.", "/jeevespage?comic_id=10208"],
["10224", "No Bgs ReNew'd!", "Sonic", "111", "107", "0.96", "Interesting", "6", "Mix of decent and horrible. Comics posted are decent, with a mix of memes. Higher rating since it has screenshots with historical value (See chapter 107)", "/jeevespage?comic_id=10224"],
["10413", "Sonic Realities", "Sonic", "6", "6", "1", "Sloppy", "3", "Pretty short fan character comic", "/jeevespage?comic_id=10413"],
["10506", "My Old Comic", "Sonic", "38", "33", "0.87", "What am I reading right now", "2", "Sally was a slut. Page 3. LOL", "/jeevespage?comic_id=10506"],
["10514", "The Mind of sc276", "Sonic", "122", "120", "0.98", "For historical purposes only", "1", "Quality is kinda yuck but seems interesting", "/jeevespage?comic_id=10514"],
["10676", "The Three of Chaos", "Sonic", "17", "10", "0.59", "For historical purposes only", "1", "Missing half the pages", "/jeevespage?comic_id=10676"],
["62037", "Dead Indeed", "Sonic", "83", "80", "0.96", "Classic Status", "10", "Dead Indeed", "/jeevespage?comic_id=62037"],
["100034", "A New Adventure", "Sonic", "8", "8", "1", "Sloppy", "3", "Some OC comic. Neat sprites", "/jeevespage?comic_id=100034"],
["100160", "another Pokemon mystery dungeon author comic", "Pokemon", "79", "76", "0.96", "For historical purposes only", "1", "Sprite Compilation with a comic halfway through", "/jeevespage?comic_id=100160"],
["100206", "The Blue Friendship", "Sonic", "23", "22", "0.96", "Nothing to write home about", "4", "Sonic goes to school and misses french class lol", "/jeevespage?comic_id=100206"],
["100209", "Author/Recolor mystery dungeon (Co-Author comic)", "Mixed", "24", "24", "1", "What am I reading right now", "2", "Random mix of sprite sheets and comics", "/jeevespage?comic_id=100209"],
["100304", "Tappa's Questions And Answers", "Megaman", "16", "16", "1", "Sloppy", "3", "Character answers questions from the audience", "/jeevespage?comic_id=100304"],
["100464", "Yoshi & Kirby", "Mixed", "109", "106", "0.97", "Passable", "5", "Both Yoshi's and Kirby's in the same world. Comic has a consistent style and a decent length.", "/jeevespage?comic_id=100464"],
["100505", "All There Was", "Mario", "55", "55", "1", "Passable", "5", "Not a sprite comic. Decent art quality. Doesn't involve Mario but does have side characters from Mario", "/jeevespage?comic_id=100505"],
["100531", ".:Nothing But Random:.", "Sonic", "8", "7", "0.88", "Sloppy", "3", "Person might be from MGComics?", "/jeevespage?comic_id=100531"],
["100564", "CPU Switch", "Sonic", "43", "39", "0.91", "For historical purposes only", "1", "Sprite Compilation. Has some sprite assets people might find interesting.", "/jeevespage?comic_id=100564"],
["100612", ".:NONSENSE:.", "Sonic", "8", "7", "0.88", "What am I reading right now", "2", "Short group comic", "/jeevespage?comic_id=100612"],
["100615", "The Inferno chronicles", "Sonic", "6", "6", "1", "For historical purposes only", "1", "This person really liked gradients and inverted colors lol", "/jeevespage?comic_id=100615"],
["100628", "From Hell and Beyond Sprite Shack", "Sonic", "11", "10", "0.91", "For historical purposes only", "1", "Sprite Compilation with fan characters", "/jeevespage?comic_id=100628"],
["100666", "NoPUNintendo", "Mario", "44", "40", "0.91", "Classic Status", "10", "Nopunintendo.net. On the same quality as GG Guys", "/jeevespage?comic_id=100666"],
["100681", "1ce k1d's museum of really crazy stuff", "Random", "269", "267", "0.99", "For historical purposes only", "1", "Random Sprite Compilation", "/jeevespage?comic_id=100681"],
["100712", "Dragon Quest Gaiden: The Crater of the Earth", "Random", "9", "9", "1", "Sloppy", "3", "Dragon Quest", "/jeevespage?comic_id=100712"],
["100779", "Rose's Garden.", "Sonic", "10", "10", "1", "For historical purposes only", "1", "Super Random", "/jeevespage?comic_id=100779"],
["100792", "The Adventures of LR Fan Base", "Sonic", "66", "65", "0.98", "For historical purposes only", "1", "Sprite Compilation with some half decent fan characters", "/jeevespage?comic_id=100792"],
["100856", "Smashfan's World Conquest", "Mixed", "73", "73", "1", "Nothing to write home about", "4", "Lot of mixels in this one, but I give them props for keeping the formatting consistent at least…", "/jeevespage?comic_id=100856"],
["100910", "KD'S Pokemon Journey", "Pokemon", "5", "5", "1", "For historical purposes only", "1", "Super short", "/jeevespage?comic_id=100910"],
["100956", "Super Sonic Comic: Act 3", "Sonic", "23", "23", "1", "Pretty Good", "7", "Very obviously inspired by InSonicnia. A shame it's so short", "/jeevespage?comic_id=100956"],
["101088", "Cyren's Showcase/Requested Sprites", "Sonic", "102", "99", "0.97", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=101088"],
["101119", "Sprite Vacation Hotel 2", "Sonic", "964", "907", "0.94", "Questioned my sanity archiving this", "0", "Sprite Compilation. People posting pictures of themselves for whatever reason lol", "/jeevespage?comic_id=101119"],
["101265", "MSMN's castle for random stuff", "Sonic", "21", "16", "0.76", "For historical purposes only", "1", "Sprite Compilation. Sprites of Neox with a tail lol", "/jeevespage?comic_id=101265"],
["101272", "The ACA Comics", "Mixed", "39", "39", "1", "What am I reading right now", "2", "Mixed bag with consistent style.", "/jeevespage?comic_id=101272"],

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






