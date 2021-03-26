/* Javascript backend calls for channel zapper */

/* Channel list is an array of:-
        channel number, URI to use, description (optional)
*/     

var channel_list = new Array();
var initted = false;
var current_uri = "";
var current_info = "";
var current_pos = "";
var osd_chan = "";
var channelPopupTimeout = 0;
var menuTimeout = 0;    /* Timeout before hiding the menu popup */
var hidecount = 0;
var subtitleInfoObj = "";   /* Object containing info about stream's subtitles */
var menuSelected = -1;  /* Used for position in array for selected */
var menuMax = -1;       /* Max number of items */
var audioInfoObj = "";

/* Private functions */
function timer_loop()
{
    if (channelPopupTimeout > 0)
    {
        channelPopupTimeout--;
        if (channelPopupTimeout == 0)
        {
            // Execute what's on the popup channel
            setTimeout("play(" + osd_chan + ")", 100); 
        }
    }
    if (hidecount > 0)
    {
        hidecount--;
        if (hidecount == 0)
        {
            // Hide the popup
            hideinfo();
        }
    }
    if (menuTimeout > 0)
    {
        menuTimeout--;
        if (menuTimeout == 0)
        {
            // Hide the menu and clear objects */
            document.getElementById("channel_menu").style.visibility = "hidden";
            subtitleInfoObj = "";
            audioInfoObj = "";
            Browser.Lower();
        }
    }
    // Call back in a second
    setTimeout("timer_loop()", 1000);
}

function get_details(channum)
{
    pos = -1;
    arraypos = 0;

    while ( (arraypos < channel_list.length) && (pos == -1) )
    {
        if (channel_list[arraypos] == channum)
        {
            current_pos = arraypos / 3;
            current_uri = channel_list[arraypos+1];
            current_info = channel_list[arraypos+2];
            pos = arraypos;
        }
        else
        {
            arraypos += 3;
        }
    }
    return pos;
}

function get_info(channum)
{
    info = "";
    arraypos = 0;

    while ( (arraypos < channel_list.length) && (info == "") )
    {
        if (channel_list[arraypos] == channum)
        {
            info = channel_list[arraypos+2];
        }
        else
        {
            arraypos += 3;
        }
    }
    return uri;
}

function channel_up()
{
    current_pos++; // Increment one up from the last given array pos
    if (current_pos >= (channel_list.length / 3) )
    {
        // Wrap round
        current_pos = 0;
    }
    play(channel_list[current_pos*3]);
}

function channel_down()
{
    current_pos--; // Deccrement one up from the last given array pos
    if (current_pos < 0 )
    {
        // Wrap round
        current_pos = (channel_list.length / 3);
    }
    play(channel_list[current_pos*3]);
}

function numeric_key(key)
{
    try {
        if (channelPopupTimeout == 0)
        {
            /* Start of entry */
            osd_chan = 0;
        }

        osd_chan *= 10;
        osd_chan = osd_chan + parseInt(key);
        var popup_str = "<html><body><p class='channel_popup'>";
        popup_str += osd_chan;
        popup_str += "<\/p><\/body><\/html>";
        document.getElementById("channel_popup").innerHTML = popup_str;
        document.getElementById("channel_popup").style.visibility = "visible";

        if (osd_chan < 100)
        {
            //ASTB.DebugString("Wait");        
            channelPopupTimeout = 2;
        }
        else
        {
            //ASTB.DebugString("Go");
            channelPopupTimeout = 0;
            play(osd_chan);
        }
    }
    catch (e) {
        alert("numeric key: " + e);
    }
}

function keyHandler(e)
{
    var pressedKey = e.which;

    if (document.all)    { e = window.event; }
    if (document.layers) { pressedKey = e.which; }
    if (document.all)    { pressedKey = e.keyCode; }

ASTB.DebugString("Keyboard - " + pressedKey);
    switch (pressedKey)
    {        
        case REMOTE_CHANNEL_UP:
            channel_up();
            break;
        case REMOTE_CHANNEL_DOWN:
            channel_down();
            break;
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
            // Number key
            Browser.Raise();
            ASTB.DebugString("Key");
            numeric_key(pressedKey-48);
            break;
        case REMOTE_TELETEXT_RED:
            if (0 == VideoDisplay.GetSubtitles() )
            {
                ASTB.DebugString("Enable subtitles");
                VideoDisplay.SetSubtitles(1);
            }
            else
            {
                ASTB.DebugString("Disable subtitles");
                VideoDisplay.SetSubtitles(0);
            }
            break;
        case REMOTE_TELETEXT_GREEN:
            if (subtitleInfoObj == "")
            {
                //str = AVMedia.GetProgramInfo(AVMedia.PROGRAM_INFO_AUDIO | AVMedia.PROGRAM_INFO_SUBTITLE);
                str = AVMedia.GetProgramInfo(AVMedia.PROGRAM_INFO_SUBTITLE);
                //ASTB.DebugString("str back from info call is " + str);
                subtitleInfoObj = eval( '(' + str + ')' );
                menuMax = 0;
                menuSelected = 0; // If not defined further down then this will select Auto

                menu = "<html><body><table class='menutable'>";
                menu += "<tr><td class='menuheader'>Subtitles<\/td><\/tr>";
                menu += "<tr><td class='menuspacer'><\/td><\/tr>";

                // Add the auto option at the top
                menu +=  "<td class='menuitem' id='menu0'>Automatic<\/td><\/tr>";

                if (subtitleInfoObj.subtitle != undefined)
                {
                   var currentlang = "";
                   if (subtitleInfoObj.subtitle.current != undefined)
                   {
                       var currentstream = subtitleInfoObj.subtitle.stream[subtitleInfoObj.subtitle.current.streamindex];
                       currentlang = currentstream.lang[subtitleInfoObj.subtitle.current.langindex];
                   }
                   numPIDs = subtitleInfoObj.subtitle.stream.length;

                   for (loop=0; loop < numPIDs; loop++)
                   {
                       thisstream = subtitleInfoObj.subtitle.stream[loop];

                       for (langloop=0; langloop < thisstream.lang.length; langloop++)
                       {
                            menuMax++;
                            menu += "<tr>";
                            thislang = thisstream.lang[langloop];
                            menu += "<td class='menuitem' id='menu" + menuMax + "'>" + thislang + "<\/td><\/tr>";
                            if (thislang == currentlang)
                            {
                                menuSelected = menuMax;
                            }
                       }
                   }
                } 
                menu += "<\/table><\/body><\/html>";

                // Update the height of the DIV to the list 
                // Need to include the height of the header as well as the items
                newsize = 30 + (menuMax * 25);  // looked right for two items
                document.getElementById("channel_menu").style.height = newsize + "px";
                Browser.Raise();
                document.getElementById("channel_menu").innerHTML = menu;
                document.getElementById("menu" + menuSelected).className = "menuselected";
                document.getElementById("channel_menu").style.visibility = "visible";
                Browser.Raise();
                menuTimeout = 2;
            }
            else
            {
                // Move down the list
//                ASTB.DebugString("Move down the list");

                // Unselect the current
ASTB.DebugString("** before menuSelected is " + menuSelected + "  menuMax is " + menuMax);                
                document.getElementById("menu" + menuSelected).className = "menuitem";
                menuSelected++;
                if (menuSelected > menuMax)
                {
                    menuSelected = 0;
                }
                document.getElementById("menu" + menuSelected).className = "menuselected";
//ASTB.DebugString("** Change menuSelected is " + menuSelected + "  menuMax is " + menuMax);                

                //ASTB.DebugString("Now set subtitles to " + document.getElementById("menu" + menuSelected).textContent);
                newlang = document.getElementById("menu" + menuSelected).textContent;
                ASTB.DebugString("Now set subtitles to " + newlang);

                if (newlang == "Automatic")
                {
                    AVMedia.SetPrimarySubtitleLanguage("");
                }
                else
                {
                    AVMedia.SetPrimarySubtitleLanguage(newlang);
                }
                menuTimeout = 2;
            }
            break;

        case REMOTE_TELETEXT_YELLOW:
            if (audioInfoObj == "")
            {
                //str = AVMedia.GetProgramInfo(AVMedia.PROGRAM_INFO_AUDIO | AVMedia.PROGRAM_INFO_SUBTITLE);
                str = AVMedia.GetProgramInfo(AVMedia.PROGRAM_INFO_AUDIO);
                //ASTB.DebugString("str back from info call is " + str);
                audioInfoObj = eval( '(' + str + ')' );
                menuMax = 0;
                menuSelected = 0; // If not defined further down then this will select Auto

                menu = "<html><body><table class='menutable'>";
                menu += "<tr><td class='menuheader'>Audio<\/td><\/tr>";
                menu += "<tr><td class='menuspacer'><\/td><\/tr>";

                // Add the auto option at the top
                menu +=  "<td class='menuitem' id='menu0'>Automatic<\/td><\/tr>";

                if (audioInfoObj.audio != undefined)
                {
                   var currentlang = "";
                   if (audioInfoObj.audio.current != undefined)
                   {
                       var currentstream = audioInfoObj.audio.stream[audioInfoObj.audio.current.streamindex];
                       currentlang = currentstream.lang[audioInfoObj.audio.current.langindex];
                   }
                   numPIDs = audioInfoObj.audio.stream.length;

                   for (loop=0; loop < numPIDs; loop++)
                   {
                       thisstream = audioInfoObj.audio.stream[loop];

                       for (langloop=0; langloop < thisstream.lang.length; langloop++)
                       {
                            menuMax++;
                            menu += "<tr>";
                            thislang = thisstream.lang[langloop];
                            menu += "<td class='menuitem' id='menu" + menuMax + "'>" + thislang + "<\/td><\/tr>";
                            if (thislang == currentlang)
                            {
                                menuSelected = menuMax;
                            }
                       }
                   }
                } 
                menu += "<\/table><\/body><\/html>";

                // Update the height of the DIV to the list 
                // Need to include the height of the header as well as the items
                newsize = 30 + (menuMax * 25);  // looked right for two items
                document.getElementById("channel_menu").style.height = newsize + "px";
                Browser.Raise();
                document.getElementById("channel_menu").innerHTML = menu;
                document.getElementById("menu" + menuSelected).className = "menuselected";
                document.getElementById("channel_menu").style.visibility = "visible";
                Browser.Raise();
                menuTimeout = 2;
            }
            else
            {
                // Move down the list
//                ASTB.DebugString("Move down the list");

                // Unselect the current
ASTB.DebugString("** before menuSelected is " + menuSelected + "  menuMax is " + menuMax);                
                document.getElementById("menu" + menuSelected).className = "menuitem";
                menuSelected++;
                if (menuSelected > menuMax)
                {
                    menuSelected = 0;
                }
                document.getElementById("menu" + menuSelected).className = "menuselected";
//ASTB.DebugString("** Change menuSelected is " + menuSelected + "  menuMax is " + menuMax);                

                //ASTB.DebugString("Now set subtitles to " + document.getElementById("menu" + menuSelected).textContent);
                newlang = document.getElementById("menu" + menuSelected).textContent;
                ASTB.DebugString("Now set subtitles to " + newlang);

                if (newlang == "Automatic")
                {
                    AVMedia.SetPrimaryAudioLanguage("");
                }
                else
                {
                    AVMedia.SetPrimaryAudioLanguage(newlang);
                }
                menuTimeout = 2;
            }
            break;

    }
}

function hideinfo()
{
    document.getElementById("channel_popup").style.visibility = "hidden";
    document.getElementById("channel_info").style.visibility = "hidden";
    Browser.Lower();
}

function onevent()
{
    switch (AVMedia.Event)
    {
        case 23:
            // PMT change - playing
            ASTB.DebugString("Now switched. Hide in 2 seconds");
            str = AVMedia.GetProgramInfo(AVMedia.PROGRAM_INFO_AUDIO | AVMedia.PROGRAM_INFO_SUBTITLE);
            hidecount = 2;
            //setTimeout("hideinfo()", 2000);
            break;
    }
}

function chan_init()
{
    if (initted == false)
    {
        try 
        {
            // Setup background colour to what the background colour in CSS
            // is set to.
            //backgroundColour = document.body.style.backgroundColor;

            // Just set Chromakey and reset background colour to that value
// For older STB            
//ASTB.DefaultKeys(0);
//ASTB.WithChannels(0);
           
            ASTB.SetMouseState(false);
            Browser.SetToolbarState(false);
            VideoDisplay.SetChromaKey(0x102030);
            document.body.style.backgroundColor = "#102030";
            AVMedia.onEvent = "onevent()";
          
            // Setup keyhandling here
            document.onkeypress = keyHandler;
        } 
        catch (e) 
        {
            alert("Error is " + e);
            // Possible error if using PC
        }

        setTimeout("timer_loop()", 1000);
        initted = true;
    }
}

function play(channum)
{
    if (initted == false)
    {
        chan_init();
    }

    if (-1 != get_details(channum) )
    {
        //AVMedia.Play("src=" + current_uri + ";eomfreeze=yes");
        // My Freeview box goes black screen when changing channel
        AVMedia.Play("src=" + current_uri );
        Browser.Raise();
        var popup_str = "<html><body><p class='channel_popup'>";
        popup_str += channum;
        popup_str += "<\/p><\/body><\/html>";
        document.getElementById("channel_popup").innerHTML = popup_str;
        document.getElementById("channel_popup").style.visibility = "visible";

        if (current_info != "")
        {
            var info_str = "<html><body><p class='channel_info'>"
            info_str += current_info;
            info_str +=  "<\/p><\/body><\/html>";
            document.getElementById("channel_info").innerHTML = info_str;
            document.getElementById("channel_info").style.visibility = "visible";
        }
        else
        {
            // If using channel up/down and the next channel doesn't have
            // description, then hide the info box
            document.getElementById("channel_info").style.visibility = "hidden"
        }

        document.getElementById("channel_menu").style.visibility = "hidden";
        hidecount = 5;
        subtitleInfoObj == "";
        // Store in a cookie this channel
        document.cookie = "lastchan=" + channum;
    }        
    else
    {
        /* Usually got here by having an invalid channel. Lower the
         * channel number popup */
        document.getElementById("channel_popup").style.visibility = "hidden";
    }
}

/* Public functions */
function add(channum, uri, description)
{
    channel_list.push(channum, uri, description);
}

function addChannelList(min, max)
{
    if ( (min == undefined) && (max == undefined) )
    {
        // Process through the whole list
        min = 0;
        max = 999;
    }

    if ( (typeof min == "number") && (typeof max == "number") )
    {
        for (loop=min; loop<=max; loop++)
        {
            uri = ASTB.GetChannel(loop);

            if ( (uri != undefined) && (uri != "") )
            {
                ASTB.DebugString("Adding " + loop + " uri = " + uri);
                add(loop, uri, "");
            }
        }
    }
    else if ( (typeof min == "object") && (max == undefined) )
    {
        // Array of specific channels
        for (loop=0; loop< min.length; loop++)
        {
            uri = ASTB.GetChannel(loop);
            if ( (uri != undefined) && (uri != "") )
            {
                ASTB.DebugString("Adding " + loop + " uri = " + uri);
                add(loop, uri, "");
            }
        }
    }
}

function start(initial)
{
    /* Look for value from cookies and use that if found.
       If not then use the value passed in as starting value */

    if (document.cookie.indexOf("lastchan=") != -1)
    {
        ASTB.DebugString("Cookie may have been set");
        ASTB.DebugString("cookie is " + document.cookie + "   lenmgth is " + document.cookie.length);
        var prevchan = document.cookie.substring(9, document.cookie.length);
        ASTB.DebugString("prevchan is " + prevchan);
        play(prevchan);
    }
    else
    {
        ASTB.DebugString("No cookie. So use default");
        play(initial);
    }        
}

