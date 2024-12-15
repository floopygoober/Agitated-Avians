$(function () {
    let blockCounter = 0;
    let birdSpawnExists = false;

    // Add a draggable rectangular block with plank physics
    $("#add-block").click(function () {
        const blockId = `block-${blockCounter++}`;
        const block = $("<div></div>")
            .addClass("block")
            .attr("id", blockId)
            .appendTo("#editor");

        block.draggable({
            containment: "#editor",
            stop: function () {
                // After dragging, apply plank physics (ensure block position is adjusted)
                applyPlankPhysics(block);
            }
        });

        block.contextmenu(function (event) {
            event.preventDefault();
            if (confirm("Delete this block?")) {
                $(this).remove();
            }
        });

        // Apply plank physics to the block (adjust block's position, handle collision, etc.)
        function applyPlankPhysics(block) {
            // Here you can apply more complex physics interactions, such as rotation or fall speed
            // For example, simulate a 'plank' by rotating it a little
            block.css({
                transform: "rotate(0deg)",
                transition: "transform 0.5s ease"
            });
        }
    });

    // Add a draggable pig (green circle)
    $("#add-pig").click(function () {
        const pigId = `pig-${blockCounter++}`;
        const pig = $("<div></div>")
            .addClass("pig")
            .attr("id", pigId)
            .appendTo("#editor");

        pig.draggable({
            containment: "#editor"
        });

        pig.contextmenu(function (event) {
            event.preventDefault();
            if (confirm("Delete this pig?")) {
                $(this).remove();
            }
        });
    });

    // Add a bird spawn (only once)
    $("#add-bird").click(function () {
        if (birdSpawnExists) {
            alert("There is already a bird spawn in the level!");
            return;
        }

        birdSpawnExists = true;
        const bird = $("<div></div>")
            .addClass("bird")
            .attr("id", "bird-spawn")
            .appendTo("#editor");

        let isDragging = false;
        let dragLine = null;

        bird.on("mousedown", function (event) {
            isDragging = true;
            const birdOffset = bird.offset();
            const startX = birdOffset.left + bird.width() / 2;
            const startY = birdOffset.top + bird.height() / 2;

            dragLine = $("<div></div>")
                .css({
                    position: "absolute",
                    border: "2px solid black",
                    zIndex: 1000
                })
                .appendTo("#editor");

            $(document).on("mousemove", function (moveEvent) {
                if (!isDragging) return;
                const endX = moveEvent.pageX - $("#editor").offset().left;
                const endY = moveEvent.pageY - $("#editor").offset().top;
                dragLine.css({
                    left: Math.min(startX, endX) + "px",
                    top: Math.min(startY, endY) + "px",
                    width: Math.abs(startX - endX) + "px",
                    height: Math.abs(startY - endY) + "px",
                    transform: `rotate(${Math.atan2(endY - startY, endX - startX) * (180 / Math.PI)}deg)`
                });
            });

            $(document).on("mouseup", function () {
                if (isDragging) {
                    isDragging = false;
                    dragLine.remove();
                    dragLine = null;
                    $(document).off("mousemove").off("mouseup");
                }
            });
        });

        bird.contextmenu(function (event) {
            event.preventDefault();
            if (confirm("Delete this bird spawn?")) {
                birdSpawnExists = false;
                $(this).remove();
            }
        });
    });

    // Ensure a solid floor exists along the bottom of the canvas
    const editorWidth = $("#editor").width();
    const floor = $("<div></div>")
        .addClass("floor")
        .css({
            width: `${editorWidth}px`,
            height: "20px",
            position: "absolute",
            bottom: "0",
            left: "0",
            backgroundColor: "brown"
        })
        .appendTo("#editor");

    // Load level list from the server
    function loadLevelList() {
        $.ajax({
            url: "http://localhost:3000/levels",
            method: "GET",
            success: function (levelIds) {
                const $levelList = $("#level-list");
                $levelList.empty();
                $levelList.append('<option value="">Select a Level</option>');
                levelIds.forEach(function (id) {
                    $levelList.append(`<option value="${id}">${id}</option>`);
                });
            },
            error: function (xhr) {
                console.error("Error fetching level list: ", xhr.responseText);
            }
        });
    }

    // Save level
    $("#save-level").click(function () {
        const levelId = $("#level-id").val().trim();

        if (!levelId) {
            alert("Please enter a level ID!");
            return;
        }

        const levelData = [];
        $(".block, .pig, .bird-spawn").each(function () {
            const $this = $(this);
            const position = $this.position();
            levelData.push({
                id: $this.attr("id"),
                x: position.left,
                y: position.top,
                width: $this.width(),
                height: $this.height(),
                type: $this.hasClass("block")
                    ? "block"
                    : $this.hasClass("pig")
                    ? "pig"
                    : "bird-spawn"
            });
        });

        if (levelData.filter(item => item.type === "bird-spawn").length !== 1) {
            alert("Please ensure exactly one bird spawn point exists.");
            return;
        }

        $.ajax({
            url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(levelData),
            success: function (response) {
                alert(response);
                loadLevelList();
            },
            error: function (xhr) {
                alert("Error saving level: " + xhr.responseText);
            }
        });
    });

    // Load a level
    $("#load-level").click(function () {
        const levelId = $("#level-list").val().trim();

        if (!levelId) {
            alert("Please select a level!");
            return;
        }

        $.ajax({
            url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
            method: "GET",
            success: function (levelData) {
                try {
                    const blocks = JSON.parse(levelData);
                    $("#editor").empty();
                    $("#editor").append(floor);

                    blocks.forEach(function (block) {
                        const $block = $("<div></div>")
                            .addClass(block.type)
                            .attr("id", block.id)
                            .css({
                                top: block.y + "px",
                                left: block.x + "px",
                                width: block.width + "px",
                                height: block.height + "px"
                            })
                            .appendTo("#editor");

                        if (block.type === "block" || block.type === "pig") {
                            $block.draggable({ containment: "#editor" });
                        } else if (block.type === "bird-spawn") {
                            birdSpawnExists = true;
                            $block.draggable({ containment: "#editor" });
                        }

                        $block.contextmenu(function (event) {
                            event.preventDefault();
                            if (confirm(`Delete this ${block.type}?`)) {
                                $(this).remove();
                                if (block.type === "bird-spawn") birdSpawnExists = false;
                            }
                        });
                    });

                    alert("Level loaded successfully!");
                } catch (error) {
                    alert("Error processing level data: " + error.message);
                }
            },
            error: function (xhr) {
                alert("Error loading level: " + xhr.responseText);
            }
        });
    });

    // Delete a level
    $("#delete-level").click(function () {
        const levelId = $("#level-list").val();

        if (!levelId) {
            alert("Please select a level to delete!");
            return;
        }

        if (!confirm(`Are you sure you want to delete level "${levelId}"?`)) {
            return;
        }

        $.ajax({
            url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
            method: "DELETE",
            success: function (response) {
                alert(response);
                loadLevelList();
            },
            error: function (xhr) {
                alert("Error deleting level: " + xhr.responseText);
            }
        });
    });

    loadLevelList();
});
