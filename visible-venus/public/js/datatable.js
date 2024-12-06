var dataSet = [
    ["10005", "GreyouTT", "Halo Online", "Halo", "301", "291", "0.97", "Nothing to write home about", "4", "Comic with occasional mix of sprites and memes. Group comic", "/jeevespage?comic_id=10005"],
    ["10065", "Maker", "SoniX", "Sonic", "10", "10", "1", "Questioned my sanity archiving this", "0", "Pretty much only put this here cause it had Sonic in it", "/jeevespage?comic_id=10065"],
    ["10070", "Manuel176", "RuneScape Misadventures", "Random", "20", "20", "1", "For historical purposes only", "1", "Runescape", "/jeevespage?comic_id=10070"],
    ["10185", "supercomputer276", "Authortastic 2.0", "Sonic", "301", "283", "0.94", "Nothing to write home about", "4", "Looks like a group comic, so quality flactuates. Has interesting character designs (mostly recolors lol) though and the authors seem to get better over time.", "/jeevespage?comic_id=10185"],
    ["10203", "YoshyRyuDCC", "What Ever Sprite Comic", "Sonic", "7", "7", "1", "Solid title", "8", "Comic tutorials by YoshiRyu, so this is a gem", "/jeevespage?comic_id=10203"],
    ["10208", "pimp_named_slinkback", "Mission Complete", "Mixed", "28", "28", "1", "Sloppy", "3", "Starfox with a mix of Mario and other characters.", "/jeevespage?comic_id=10208"],
    ["10224", "Xavier the Fox", "No Bgs ReNew'd!", "Sonic", "111", "107", "0.96", "Interesting", "6", "Mix of decent and horrible. Comics posted are decent, with a mix of memes. Higher rating since it has screenshots with historical value (See chapter 107)", "/jeevespage?comic_id=10224"],
    ["10413", "Pokeshadow", "Sonic Realities", "Sonic", "6", "6", "1", "Sloppy", "3", "Pretty short fan character comic", "/jeevespage?comic_id=10413"],
    ["10506", "Entoxica", "My Old Comic", "Sonic", "38", "33", "0.87", "What am I reading right now", "2", "Sally was a slut. Page 3. LOL", "/jeevespage?comic_id=10506"],
    ["10514", "supercomputer276", "The Mind of sc276", "Sonic", "122", "120", "0.98", "For historical purposes only", "1", "Quality is kinda yuck but seems interesting", "/jeevespage?comic_id=10514"],
    ["10676", "Flame_The_Hybrid", "The Three of Chaos", "Sonic", "17", "10", "0.59", "For historical purposes only", "1", "Missing half the pages", "/jeevespage?comic_id=10676"],
    ["62037", "Lyoko the Newt", "Dead Indeed", "Sonic", "83", "80", "0.96", "Classic Status", "10", "Dead Indeed", "/jeevespage?comic_id=62037"],
    ["100034", "Hazel The Hedgehog", "A New Adventure", "Sonic", "8", "8", "1", "Sloppy", "3", "Some OC comic. Neat sprites", "/jeevespage?comic_id=100034"],
    ["100160", "Shade2470", "another Pokemon mystery dungeon author comic", "Pokemon", "79", "76", "0.96", "For historical purposes only", "1", "Sprite Compilation with a comic halfway through", "/jeevespage?comic_id=100160"],
    ["100206", "Hero of Comedy", "The Blue Friendship", "Sonic", "23", "22", "0.96", "Nothing to write home about", "4", "Sonic goes to school and misses french class lol", "/jeevespage?comic_id=100206"],
    ["100209", "Zekrom123", "Author/Recolor mystery dungeon (Co-Author comic)", "Mixed", "24", "24", "1", "What am I reading right now", "2", "Random mix of sprite sheets and comics", "/jeevespage?comic_id=100209"],
    ["100304", "Alienoid", "Tappa's Questions And Answers", "Megaman", "16", "16", "1", "Sloppy", "3", "Character answers questions from the audience", "/jeevespage?comic_id=100304"],
    ["100464", "Ultimate Yoshi", "Yoshi & Kirby", "Mixed", "109", "106", "0.97", "Passable", "5", "Both Yoshi's and Kirby's in the same world. Comic has a consistent style and a decent length.", "/jeevespage?comic_id=100464"],
    ["100505", "SelanPike", "All There Was", "Mario", "55", "55", "1", "Passable", "5", "Not a sprite comic. Decent art quality. Doesn't involve Mario but does have side characters from Mario", "/jeevespage?comic_id=100505"],
    ["100531", "DelSoul", ".:Nothing But Random:.", "Sonic", "8", "7", "0.88", "Sloppy", "3", "Person might be from MGComics?", "/jeevespage?comic_id=100531"],
    ["100564", "jameswolf100", "CPU Switch", "Sonic", "43", "39", "0.91", "For historical purposes only", "1", "Sprite Compilation. Has some sprite assets people might find interesting.", "/jeevespage?comic_id=100564"],
    ["100612", "Faekmastah", ".:NONSENSE:.", "Sonic", "8", "7", "0.88", "What am I reading right now", "2", "Short group comic", "/jeevespage?comic_id=100612"],
    ["100615", "sonicfan42", "The Inferno chronicles", "Sonic", "6", "6", "1", "For historical purposes only", "1", "This person really liked gradients and inverted colors lol", "/jeevespage?comic_id=100615"],
    ["100628", "Master J M13", "From Hell and Beyond Sprite Shack", "Sonic", "11", "10", "0.91", "For historical purposes only", "1", "Sprite Compilation with fan characters", "/jeevespage?comic_id=100628"],
    ["100666", "TerminalMontage", "NoPUNintendo", "Mario", "44", "40", "0.91", "Classic Status", "10", "Nopunintendo.net. On the same quality as GG Guys", "/jeevespage?comic_id=100666"],
    ["100681", "1ce_k1d", "1ce k1d's museum of really crazy stuff", "Random", "269", "267", "0.99", "For historical purposes only", "1", "Random Sprite Compilation", "/jeevespage?comic_id=100681"],
    ["100712", "TDB", "Dragon Quest Gaiden: The Crater of the Earth", "Random", "9", "9", "1", "Sloppy", "3", "Dragon Quest", "/jeevespage?comic_id=100712"],
    ["100779", "Amy Rose the Hedehog", "Rose's Garden.", "Sonic", "10", "10", "1", "For historical purposes only", "1", "Super Random", "/jeevespage?comic_id=100779"],
    ["100792", "Bre Ishurna the Wolf", "The Adventures of LR Fan Base", "Sonic", "66", "65", "0.98", "For historical purposes only", "1", "Sprite Compilation with some half decent fan characters", "/jeevespage?comic_id=100792"],
    ["100856", "Smashfan64", "Smashfan's World Conquest", "Mixed", "73", "73", "1", "Nothing to write home about", "4", "Lot of mixels in this one, but I give them props for keeping the formatting consistent at least…", "/jeevespage?comic_id=100856"],
    ["100910", "PKNESS", "KD'S Pokemon Journey", "Pokemon", "5", "5", "1", "For historical purposes only", "1", "Super short", "/jeevespage?comic_id=100910"],
    ["100956", "METAL SHADOWmk80", "Super Sonic Comic: Act 3", "Sonic", "23", "23", "1", "Pretty Good", "7", "Very obviously inspired by InSonicnia. A shame it's so short", "/jeevespage?comic_id=100956"],
    ["101088", "SonicWad", "Cyren's Showcase/Requested Sprites", "Sonic", "102", "99", "0.97", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=101088"],
    ["101119", "13thecat", "Sprite Vacation Hotel 2", "Sonic", "964", "907", "0.94", "Questioned my sanity archiving this", "0", "Sprite Compilation. People posting pictures of themselves for whatever reason lol", "/jeevespage?comic_id=101119"],
    ["101265", "mariosonicmegaman", "MSMN's castle for random stuff", "Sonic", "21", "16", "0.76", "For historical purposes only", "1", "Sprite Compilation. Sprites of Neox with a tail lol", "/jeevespage?comic_id=101265"],
    ["101272", "Luigifan2000", "The ACA Comics", "Mixed", "39", "39", "1", "What am I reading right now", "2", "Mixed bag with consistent style.", "/jeevespage?comic_id=101272"],
    ["101433", "yugi67", "Pokemon Voyagers", "Pokemon", "9", "9", "1", "Passable", "5", "Went on hiatus pretty quickly lol", "/jeevespage?comic_id=101433"],
    ["101468", "Pengijoker", "A KaTAM Comik (More about the Mirror World!)", "Kirby", "13", "13", "1", "What am I reading right now", "2", "Incredibly random", "/jeevespage?comic_id=101468"],
    ["101524", "YoshyRyuDCC", "TSZ Weekly", "Sonic", "5", "5", "1", "Interesting", "6", "Looks to be a tutorial comic", "/jeevespage?comic_id=101524"],
    ["101706", "Gehshi Tyukinomi", "Rockhorn Academy", "Sonic", "12", "12", "1", "For historical purposes only", "1", "Fan character goes to academy. The end", "/jeevespage?comic_id=101706"],
    ["101787", "darkin1998", "Around the world in 8-bit days", "Mario", "11", "11", "1", "For historical purposes only", "1", "Lots of white space", "/jeevespage?comic_id=101787"],
    ["101802", "Scrape the Wolf", "Sonic Blitz", "Sonic", "23", "22", "0.96", "Nothing to write home about", "4", "Interesting character sprites though :0", "/jeevespage?comic_id=101802"],
    ["101912", "Extreme5000", "Sonic the Hedgehog : Funny Files", "Sonic", "19", "19", "1", "For historical purposes only", "1", "Definitely made in MS Paint lol. The aspect ratios are all stretched", "/jeevespage?comic_id=101912"],
    ["101992", "Zpawn", "The Empire", "Sonic", "12", "12", "1", "Passable", "5", "Decent look and style. Only 12 pages", "/jeevespage?comic_id=101992"],
    ["102037", "SonicFan8690", "The Shadow's Edge", "Sonic", "6", "6", "1", "For historical purposes only", "1", "Game select comic", "/jeevespage?comic_id=102037"],
    ["102071", "tekern", "Tek's sprites.", "Sonic", "32", "32", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=102071"],
    ["102080", "Gigi19972010", "Kirby And The Magic Mirror", "Kirby", "45", "38", "0.84", "Pretty Good", "7", "Has a pretty consistent style through out", "/jeevespage?comic_id=102080"],
    ["102081", "Gehshi Tyukinomi", "Choose your own random adventure: REVIVAL BISH!", "Sonic", "10", "10", "1", "For historical purposes only", "1", "This person just learned the word fap lol", "/jeevespage?comic_id=102081"],
    ["102280", "Metalchaos0", "Mega Man: The Fan Wars", "Megaman", "8", "8", "1", "Interesting", "6", "Great aesthetic", "/jeevespage?comic_id=102280"],
    ["102451", "FakeMonMaster", "Dragon Ball Sonic (Hiatus: Sunday-Following Sunday)", "Sonic", "9", "9", "1", "What am I reading right now", "2", "Uses MFZ DBZ sprites", "/jeevespage?comic_id=102451"],
    ["102515", "DrizzyZX", "Digimon World X", "Sonic", "12", "12", "1", "Passable", "5", "Seems to cross-over with Digimon", "/jeevespage?comic_id=102515"],
    ["102518", "Banisher_of_Sun", "my dump", "Sonic", "28", "27", "0.96", "For historical purposes only", "1", "Sprite Compilation. Some interesting designs", "/jeevespage?comic_id=102518"],
    ["102537", "LuigidamanV2", "Sonic Hotel Online 4:Summer Lasts Forever?", "Sonic", "7", "7", "1", "For historical purposes only", "1", "Rooms…and sprites", "/jeevespage?comic_id=102537"],
    ["102539", "hedgehog bros", "my fan characater sprites", "Sonic", "14", "14", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=102539"],
    ["102550", "Ceviana", "Super Sonic Style!", "Sonic", "15", "15", "1", "Interesting", "6", "The faces in this are hilarious", "/jeevespage?comic_id=102550"],
    ["102614", "Josephk", "The Attack of the Recolours Season 1", "Sonic", "119", "111", "0.93", "Passable", "5", "Has a lot of recolors but the paneling and text boxes make it a decent read", "/jeevespage?comic_id=102614"],
    ["102766", "prollynotfunny", "Spacemen Go To Mars", "Random", "42", "42", "1", "For historical purposes only", "1", "Among us comic lol. probablynotfunny.com", "/jeevespage?comic_id=102766"],
    ["102838", "Mijaskal", "Hello, World!", "Random", "21", "21", "1", "For historical purposes only", "1", "Random computer comic that was kinda amusing", "/jeevespage?comic_id=102838"],
    ["102850", "Rio The Phoenix hermit", "Rio's sprite works and edits", "Sonic", "57", "55", "0.96", "Interesting", "6", "Lot's of neat sprite sheets here", "/jeevespage?comic_id=102850"],
    ["102896", "sonicstar4453", "My Bump Box", "Sonic", "25", "25", "1", "Passable", "5", "Sprite Compilation and Tutorials ", "/jeevespage?comic_id=102896"],
    ["102912", "8-bitSilverSnake", "The Truce", "Sonic", "6", "6", "1", "Passable", "5", "Style is decent. Small comic though", "/jeevespage?comic_id=102912"],
    ["102942", "LerakuTH", "Chaotic Continuation", "Sonic", "12", "12", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=102942"],
    ["103014", "Superdimentiobros", "Waddle Dee Kingdom", "Kirby", "6", "6", "1", "For historical purposes only", "1", "What!? Kirby!? NOO!!!!!!!!", "/jeevespage?comic_id=103014"],
    ["103059", "Ultimaexe24", "Traverse (old)", "Sonic", "12", "12", "1", "Interesting", "6", "Looks like this one had some potential", "/jeevespage?comic_id=103059"],
    ["103159", "CarnageRulez312", "Champion of Champions", "Mixed", "117", "13", "0.11", "Interesting", "6", "Some sprites look custom. This also seems to be a group comic", "/jeevespage?comic_id=103159"],
    ["103265", "Brokor", "Reversed Dimensions", "Mixed", "35", "34", "0.97", "Passable", "5", "Cross between Megaman and Kirby. Halfway decent", "/jeevespage?comic_id=103265"],
    ["103276", "Ken Cohen", "A Comic.", "Random", "10", "10", "1", "Interesting", "6", "THIS IS A COMIC", "/jeevespage?comic_id=103276"],
    ["103283", "Raging Ghost", "Episodes from Dreamland", "Kirby", "8", "8", "1", "Interesting", "6", "I actually kinda dig the style of this one", "/jeevespage?comic_id=103283"],
    ["103297", "omencatz", "The Same, but Different worlds", "Sonic", "98", "98", "1", "Passable", "5", "A time piece of the era", "/jeevespage?comic_id=103297"],
    ["103332", "Silvergeno", "Geno and Rockin's Sprite Showcase", "Sonic", "39", "39", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=103332"],
    ["103486", "awsome guy", "No Comment ^o^", "Mixed", "52", "52", "1", "Solid title", "8", "Style looks decently polished", "/jeevespage?comic_id=103486"],
    ["103542", "Scrape the Wolf", "Chaotix: Rebirth", "Sonic", "5", "4", "0.8", "What am I reading right now", "2", "Sonic FC's on Megaman maps", "/jeevespage?comic_id=103542"],
    ["103591", "TrentTheFox", "Sonic Advanced Online Adventures", "Sonic", "19", "19", "1", "Interesting", "6", "Wow. This comic was a little more than decent. It's a shame the author stopped at 19 pages", "/jeevespage?comic_id=103591"],
    ["103616", "SoulRyan", "WHUT THE MARIO", "Sonic", "11", "11", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=103616"],
    ["103659", "hedgehog bros", "hedgehog bros heroes", "Sonic", "5", "5", "1", "For historical purposes only", "1", "Banner Compilation", "/jeevespage?comic_id=103659"],
    ["103660", "shadowmwape", "Shadow Sprite showcase", "Mixed", "86", "86", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=103660"],
    ["103727", "FlareTheWolf", "TheLengend", "Mixed", "9", "9", "1", "What am I reading right now", "2", "Baby Sonic meets baby Yoshi", "/jeevespage?comic_id=103727"],
    ["103765", "Blast the Hunter", "It's Another Author's Comic!", "Mixed", "62", "61", "0.98", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=103765"],
    ["103771", "Re-evolution", "Kirby and Koopa", "Mixed", "11", "11", "1", "Sloppy", "3", "Mix of Kirby and Bowser's Kingdom Koopa", "/jeevespage?comic_id=103771"],
    ["103969", "Scrape the Wolf", "Zero: Returning Chronicle", "Mixed", "14", "14", "1", "Sloppy", "3", "Nintendo Worlds Collide", "/jeevespage?comic_id=103969"],
    ["103972", "Nameless5511", "Mega World", "Megaman", "36", "36", "1", "Passable", "5", "Nice consistent style here", "/jeevespage?comic_id=103972"],
    ["104031", "supersonicfan0", "Gamerman and Warren", "Megaman", "12", "12", "1", "Nothing to write home about", "4", "Lots of white space", "/jeevespage?comic_id=104031"],
    ["104054", "Sayaman", "Blake the Hedgehog: Seeds of the Future", "Sonic", "59", "56", "0.95", "Passable", "5", "Starts as a sprite compilation but turns into a comic after about page 8-10.", "/jeevespage?comic_id=104054"],
    ["104059", "JoFro", "Total Pokemon Series", "Pokemon", "203", "203", "1", "Pretty Good", "7", "Pokemon Island. Pretty good quality. Story seems like its split into parts too.", "/jeevespage?comic_id=104059"],
    ["104116", "OnyxChimp", "A Regular Day For Shadow", "Sonic", "11", "10", "0.91", "Nothing to write home about", "4", "Friday Reference. Kinda funny", "/jeevespage?comic_id=104116"],
    ["104208", "Fyaro", "The Sonic Pocket Sprite showcase", "Sonic", "72", "72", "1", "Interesting", "6", "Sprite Compilation - Lots of Sonic Pocket Adventure sprites", "/jeevespage?comic_id=104208"],
    ["104209", "XeroTheHedgehog", "The Clan Of The SwordMen!", "Sonic", "9", "9", "1", "What am I reading right now", "2", "There's a fight going on and Sonic wants to take a nap…lol", "/jeevespage?comic_id=104209"],
    ["104214", "avengedS3venTimes", "PMD End The Rapture", "Pokemon", "13", "13", "1", "Nothing to write home about", "4", "Decent paneling", "/jeevespage?comic_id=104214"],
    ["104223", "Angel the Tenric", "The New Azreal", "Sonic", "5", "5", "1", "Sloppy", "3", "There are two things I like about this comic…:P", "/jeevespage?comic_id=104223"],
    ["104254", "DarkSoniic", "sonis haunted mansion", "Sonic", "21", "21", "1", "Interesting", "6", "Haloween themed comic. Character is green af lol", "/jeevespage?comic_id=104254"],
    ["104265", "Evilracoon", "Somewhere (old)", "Halo", "96", "96", "1", "Passable", "5", "Halo 3D comic", "/jeevespage?comic_id=104265"],
    ["104338", "ElSmitty", "Adventures of Rob and Will", "Mario", "53", "53", "1", "Solid title", "8", "Reeeaaalllly cool Super Mario comic. I love the style.", "/jeevespage?comic_id=104338"],
    ["104344", "PMCG99", "Comical Sonic", "Sonic", "7", "7", "1", "For historical purposes only", "1", "The JPEG hurrrrrrts", "/jeevespage?comic_id=104344"],
    ["104352", "Emulis", "Spriters ShowCase Reloaded", "Mixed", "14", "14", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=104352"],
    ["104437", "XweeXHowl", "Burnt Academy", "Sonic", "5", "5", "1", "What am I reading right now", "2", "Burnt Academy. Also Burnt Comic", "/jeevespage?comic_id=104437"],
    ["104594", "Master J M13", "A Life With Friends: Back Home", "Sonic", "11", "10", "0.91", "What am I reading right now", "2", "Style is fine but too random", "/jeevespage?comic_id=104594"],
    ["104604", "T-mizzle90", "Fly or Fail", "Mixed", "135", "117", "0.87", "Interesting", "6", "Group Comic. Random but with decent content", "/jeevespage?comic_id=104604"],
    ["104646", "Fuzzy Fox", "SMG.exe", "Sonic", "6", "6", "1", "Nothing to write home about", "4", "MGComics artist spotted!!!", "/jeevespage?comic_id=104646"],
    ["104692", "MasterTalon", "Countdown to Zero Hour", "Megaman", "94", "94", "1", "Solid title", "8", "Excellent style. Very consistent. Even has an ending.", "/jeevespage?comic_id=104692"],
    ["104763", "BlazeTheHedgehog", "The Chronicle", "Sonic", "5", "5", "1", "Nothing to write home about", "4", "Fancy font there", "/jeevespage?comic_id=104763"],
    ["104818", "Derek_TH15", "FOREST AND FRIENDS ANAL DICK SUCKING SHOWCASE", "Sonic", "34", "32", "0.94", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=104818"],
    ["104921", "FlareTheWolf", "THE HALL OF GAY SHOWCASES", "Sonic", "85", "85", "1", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=104921"],
    ["105017", "dahatta", "Video Game House", "Mixed", "26", "26", "1", "Sloppy", "3", "Luigo wants to kill Mario", "/jeevespage?comic_id=105017"],
    ["105113", "R3kkI", "Point A to Point B", "Sonic", "6", "6", "1", "For historical purposes only", "1", "Sprite Compilation. Actually decent quality sprites. Beware of page one.", "/jeevespage?comic_id=105113"],
    ["105116", "Darkus the Hedgehog", "Darkus' New Showcase", "Sonic", "248", "241", "0.97", "For historical purposes only", "1", "Sprite Compilation", "/jeevespage?comic_id=105116"],
    ["105141", "Derek_TH15", "Sprite Author Dimension", "Sonic", "24", "24", "1", "For historical purposes only", "1", "Sprite Compilation. Lots of background spaces", "/jeevespage?comic_id=105141"],
    ["105170", "Rest", "Forever Plus", "Sonic", "11", "1", "0.09", "Interesting", "6", "Only one image. The rest are missing. Characters and art look cool", "/jeevespage?comic_id=105170"],
    ["105204", "dahatta", "Dylan's Comic", "Sonic", "13", "13", "1", "What am I reading right now", "2", "Espio turns into Duke Nukem", "/jeevespage?comic_id=105204"],
    ["105248", "Khran1505", "Around The Corner", "Sonic", "15", "15", "1", "Solid title", "8", "Around the Corner. Excellent looking comic. Got some MG characters too", "/jeevespage?comic_id=105248"],
    ["105298", "TrentTheFox", "TrentTheFox's Sprite Showcase", "Sonic", "16", "16", "1", "Interesting", "6", "Sprite Compilation. Decent tutorials too.", "/jeevespage?comic_id=105298"],
    ["105371", "imadoofus", "Mario's Home Life", "Mario", "24", "24", "1", "What am I reading right now", "2", "It snowed OMG!!!", "/jeevespage?comic_id=105371"],
    ["105373", "CrippleCakes", "ABOOGP", "Mixed", "17", "17", "1", "Interesting", "6", "Interesting parody comic", "/jeevespage?comic_id=105373"],
    ["105430", "Darkus the Hedgehog", "Ask Valker, Scrape and Blake", "Sonic", "8", "8", "1", "For historical purposes only", "1", "Question and answer comic, where the author doesn't let us know the question lol", "/jeevespage?comic_id=105430"],
    ["105612", "Chaos The Hedgehog4444", "Shadow Plague Rising", "Mixed", "45", "45", "1", "Interesting", "6", "Sprite comic. Reads like a game", "/jeevespage?comic_id=105612"],
    ["105772", "Plazmaz", "Mario and Sonic: Changing Dimensions", "Mixed", "29", "5", "0.17", "Sloppy", "3", "Comic starts out strong with Luigi in a dress", "/jeevespage?comic_id=105772"],
    ["105825", "PKNESS", "Team Anarchyx", "Sonic", "19", "19", "1", "Interesting", "6", "I like how the characters look in this one", "/jeevespage?comic_id=105825"],
    ["105834", "abro", "Abro's Junk Folder", "Sonic", "49", "49", "1", "For historical purposes only", "1", "Sprite Compilation. Some interesting ideas", "/jeevespage?comic_id=105834"],
    ["105853", "PKNESS", "My Stories", "Sonic", "27", "27", "1", "Interesting", "6", "Lotsa Fan Characters", "/jeevespage?comic_id=105853"],
    ["105905", "Scrape the Wolf", "Modern Life", "Sonic", "8", "8", "1", "Nothing to write home about", "4", "What if heroes and villains got along", "/jeevespage?comic_id=105905"],
    ["105969", "Darkus the Hedgehog", "Cyber Sonic the Hedgehog", "Sonic", "5", "5", "1", "For historical purposes only", "1", "Random Group comic", "/jeevespage?comic_id=105969"],
    ["105973", "AlecTH", "Sonic Saber", "Sonic", "5", "5", "1", "What am I reading right now", "2", "Author quit so fast lol", "/jeevespage?comic_id=105973"],
    ["105998", "ComicMayhemer2178", "Sonic Gets Mail", "Mixed", "35", "35", "1", "Questioned my sanity archiving this", "0", "MS Paint comic", "/jeevespage?comic_id=105998"],
    ["106004", "piplup302", "Chao Comix", "Sonic", "6", "6", "1", "Questioned my sanity archiving this", "0", "Chao comic with a lot of red space", "/jeevespage?comic_id=106004"],
    ["106099", "Kalma", "My Friends Next Door", "Sonic", "24", "24", "1", "Passable", "5", "Hand drawn comic. Sk8rhog looking character in there too. Plot looks decent too.", "/jeevespage?comic_id=106099"],
    ["106104", "SteamingBullet", "The Forgotten Story", "Mixed", "19", "19", "1", "Interesting", "6", "Interesting style", "/jeevespage?comic_id=106104"],
    ["106307", "awsome guy", "The Key Hotel (Ending)", "Sonic", "350", "343", "0.98", "For historical purposes only", "1", "Sprite Compilation. Fair amount of comics as well.", "/jeevespage?comic_id=106307"],
    ["106410", "blazikendude", "purgatory and the abyssmial plains", "Sonic", "102", "102", "1", "For historical purposes only", "1", "Sprite Compilation. Some comics", "/jeevespage?comic_id=106410"],
    ["106429", "Tentakustar134", "Primitive Power!", "Sonic", "13", "13", "1", "Interesting", "6", "Sonic and lucky star. Digital.", "/jeevespage?comic_id=106429"],
    ["106454", "awsome guy", "Who are the Real Heroes", "Megaman", "11", "11", "1", "Interesting", "6", "Looks nice. Too bad it was so short", "/jeevespage?comic_id=106454"],
    ["106576", "Radman1889", "The Royal Radical Rumble", "Mixed", "14", "14", "1", "Passable", "5", "Royal Radical Rumble. Looks like it had potential", "/jeevespage?comic_id=106576"],
    ["148593", "Dregan", "Friday Night Ferocity", "Sonic", "74", "0", "0", "For historical purposes only", "1", "Nothing here unfortunately :(", "/jeevespage?comic_id=148593"],
    ["149591", "Electrisa", "Pixels, Paintings and Pandemonium", "Mixed", "33", "27", "0.82", "Interesting", "6", "Some great art in this one", "/jeevespage?comic_id=149591"],
    ["155906", "1337F0X", "The Purple Fox Tail", "Mixed", "19", "16", "0.84", "Interesting", "6", "Some interesting backgrounds in this one", "/jeevespage?comic_id=155906"],
    ["76749", "Dregan", "Choose Your Own Bar'd", "Sonic", "26", "27", "1.04", "Solid title", "8", "A great little addition to Bar'd", "/jeevespage?comic_id=76749"],
    ["81574", "Esav the Centaur", "bard future", "Sonic", "9", "9", "1", "What am I reading right now", "2", "This person was obviously a big fan of Bar'd lol", "/jeevespage?comic_id=81574"],
    
];

var table = $('#example').DataTable({
    columns: [
        { title: 'Comic #'},
        { title: 'Author'},
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
            targets: [1]
        },
        {
            searchPanes: {
                show: false
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
            searchPanes: {
                show: true
            },
            targets: [8]
        },
        {
            targets: 6, // Index of the column to format
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






