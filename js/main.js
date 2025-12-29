/**
 * Sets up Justified Gallery.
 */
if (!!$.prototype.justifiedGallery) {
  var options = {
    rowHeight: 140,
    margins: 4,
    lastRow: "justify"
  };
  $(".article-gallery").justifiedGallery(options);
}

$(document).ready(function() {

  /**
   * Shows the responsive navigation menu on mobile.
   */
  $("#header > #nav > ul > .icon").click(function() {
    $("#header > #nav > ul").toggleClass("responsive");
  });


  /**
   * Controls the different versions of  the menu in blog post articles 
   * for Desktop, tablet and mobile.
   */
  if ($(".post").length) {
    var menu = $("#menu");
    var nav = $("#menu > #nav");
    var menuIcon = $("#menu-icon, #menu-icon-tablet");

    /**
     * Display the menu on hi-res laptops and desktops.
     */
    if ($(document).width() >= 1440) {
      menu.show();
      menuIcon.addClass("active");
    }

    /**
     * Display the menu if the menu icon is clicked.
     */
    menuIcon.click(function() {
      if (menu.is(":hidden")) {
        menu.show();
        menuIcon.addClass("active");
      } else {
        menu.hide();
        menuIcon.removeClass("active");
      }
      return false;
    });

    /**
     * Add a scroll listener to the menu to hide/show the navigation links.
     */
    if (menu.length) {
      $(window).on("scroll", function() {
        var topDistance = menu.offset().top;

        // hide only the navigation links on desktop
        if (!nav.is(":visible") && topDistance < 50) {
          nav.show();
        } else if (nav.is(":visible") && topDistance > 100) {
          nav.hide();
        }

        // on tablet, hide the navigation icon as well and show a "scroll to top
        // icon" instead
        if ( ! $( "#menu-icon" ).is(":visible") && topDistance < 50 ) {
          $("#menu-icon-tablet").show();
          $("#top-icon-tablet").hide();
        } else if (! $( "#menu-icon" ).is(":visible") && topDistance > 100) {
          $("#menu-icon-tablet").hide();
          $("#top-icon-tablet").show();
        }
      });
    }

    /**
     * Show mobile navigation menu after scrolling upwards,
     * hide it again after scrolling downwards.
     */
    if ($( "#footer-post").length) {
      var lastScrollTop = 0;
      $(window).on("scroll", function() {
        var topDistance = $(window).scrollTop();

        if (topDistance > lastScrollTop){
          // downscroll -> show menu
          $("#footer-post").hide();
        } else {
          // upscroll -> hide menu
          $("#footer-post").show();
        }
        lastScrollTop = topDistance;

        // close all submenu"s on scroll
        $("#nav-footer").hide();
        $("#toc-footer").hide();
        $("#share-footer").hide();

        // show a "navigation" icon when close to the top of the page, 
        // otherwise show a "scroll to the top" icon
        if (topDistance < 50) {
          $("#actions-footer > #top").hide();
        } else if (topDistance > 100) {
          $("#actions-footer > #top").show();
        }
      });
    }

    /**
     * TOC scroll spy - highlight current section
     */
    if ($("#toc").length) {
      // Get all TOC links
      var tocLinks = $("#toc a");

      // Build a map of heading IDs to their elements
      var headingMap = {};
      var headingOrder = [];

      $("h1, h2, h3, h4, h5, h6").each(function() {
        var id = $(this).attr("id");
        if (id) {
          headingMap[id] = $(this);
          headingOrder.push(id);
        }
      });

      if (headingOrder.length > 0 && tocLinks.length > 0) {
        // Function to update active TOC link
        function updateActiveTocLink() {
          var scrollPosition = $(window).scrollTop();
          var windowHeight = $(window).height();
          var documentHeight = $(document).height();

          // Check if we're at the bottom of the page
          var isAtBottom = scrollPosition + windowHeight >= documentHeight - 50;

          var currentId = null;

          if (isAtBottom) {
            // If at bottom, highlight the last heading
            currentId = headingOrder[headingOrder.length - 1];
          } else {
            // Find the current heading (the last one that is above the viewport)
            for (var i = 0; i < headingOrder.length; i++) {
              var id = headingOrder[i];
              var heading = headingMap[id];
              var headingTop = heading.offset().top;

              // Adjust offset to trigger earlier (200px before the heading)
              if (scrollPosition >= headingTop - 200) {
                currentId = id;
              }
            }
          }

          // Remove active class from all TOC links
          tocLinks.removeClass("active");

          // Add active class to current link
          if (currentId) {
            // Try to find the link by matching the hash
            var found = false;
            tocLinks.each(function() {
              var href = $(this).attr("href");
              if (href) {
                // Extract hash from href
                var hash = href.substring(href.indexOf("#") + 1);
                // Decode the URL-encoded hash and compare with the ID
                try {
                  if (decodeURIComponent(hash) === currentId) {
                    $(this).addClass("active");
                    found = true;
                  }
                } catch (e) {
                  // If decoding fails, try direct comparison
                  if (hash === currentId) {
                    $(this).addClass("active");
                    found = true;
                  }
                }
              }
            });
          }
        }

        // Attach scroll event with throttling for better performance
        var scrollTimeout;
        $(window).on("scroll", function() {
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }
          scrollTimeout = setTimeout(updateActiveTocLink, 10);
        });

        // Trigger on page load and after a short delay
        setTimeout(updateActiveTocLink, 100);

        // Also update when clicking TOC links
        tocLinks.on("click", function() {
          setTimeout(updateActiveTocLink, 100);
        });
      }
    }
  }
});
