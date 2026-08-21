<?php
function extension_install_floorplan() {
    $commonObject = new ExtensionCommon;

    // Drop legacy tables if they exist
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_objects`");
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_rooms`");
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_floors`");
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_buildings`");

    // 1. Create DB Tables
    $query = "
    CREATE TABLE IF NOT EXISTS `plugin_floorplan_locations` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `parent_id` int(11) DEFAULT NULL,
      `type` enum('building','floor','room') NOT NULL,
      `name` varchar(255) NOT NULL,
      `sequence` int(11) NOT NULL DEFAULT '0',
      PRIMARY KEY (`id`),
      KEY `parent_id` (`parent_id`),
      CONSTRAINT `fk_fp_loc_parent` FOREIGN KEY (`parent_id`) REFERENCES `plugin_floorplan_locations` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ";
    $commonObject->sqlQuery($query);

    $query = "
    CREATE TABLE IF NOT EXISTS `plugin_floorplan_assets` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `room_id` int(11) NOT NULL,
      `hardware_id` int(11) NOT NULL,
      `pos_x` float NOT NULL,
      `pos_y` float NOT NULL,
      `rotation` float NOT NULL DEFAULT '0',
      PRIMARY KEY (`id`),
      KEY `room_id` (`room_id`),
      CONSTRAINT `fk_fp_assets_room` FOREIGN KEY (`room_id`) REFERENCES `plugin_floorplan_locations` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ";
    $commonObject->sqlQuery($query);

    $query = "
    CREATE TABLE IF NOT EXISTS `plugin_floorplan_rooms_data` (
      `room_id` int(11) NOT NULL,
      `canvas_width` int(11) NOT NULL DEFAULT '1200',
      `canvas_height` int(11) NOT NULL DEFAULT '800',
      `architecture_payload` text,
      PRIMARY KEY (`room_id`),
      CONSTRAINT `fk_fp_rooms_data_room` FOREIGN KEY (`room_id`) REFERENCES `plugin_floorplan_locations` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ";
    $commonObject->sqlQuery($query);

    // Mock data seeding removed for MVP. Database starts clean.

    // OCS routing is handled natively by the folder structure
    $urlsXmlPath = __DIR__ . '/../../config/urls.xml';
    if (file_exists($urlsXmlPath)) {
        $urlsXml = file_get_contents($urlsXmlPath);
        if (strpos($urlsXml, 'key="ms_floorplan"') === false) {
            $urlsXml = str_replace('</urls>', "    <url key=\"ms_floorplan\">\n        <value>floorplan</value>\n        <directory>ms_floorplan</directory>\n    </url>\n</urls>", $urlsXml);
            file_put_contents($urlsXmlPath, $urlsXml);
        }
    }

    // 4. Grant access to Super Admin profile
    $sadminXmlPath = __DIR__ . '/../../config/profiles/sadmin.xml';
    if (file_exists($sadminXmlPath)) {
        $sadminXml = file_get_contents($sadminXmlPath);
        if (strpos($sadminXml, '<page>ms_floorplan</page>') === false) {
            $sadminXml = str_replace('</pages>', "    <page>ms_floorplan</page>\n  </pages>", $sadminXml);
            file_put_contents($sadminXmlPath, $sadminXml);
        }
    }
    
    // Also grant to standard admin if it exists
    $adminXmlPath = __DIR__ . '/../../config/profiles/admin.xml';
    if (file_exists($adminXmlPath)) {
        $adminXml = file_get_contents($adminXmlPath);
        if (strpos($adminXml, '<page>ms_floorplan</page>') === false) {
            $adminXml = str_replace('</pages>', "    <page>ms_floorplan</page>\n  </pages>", $adminXml);
            file_put_contents($adminXmlPath, $adminXml);
        }
    }

    return true;
}

function extension_delete_floorplan() {
    $commonObject = new ExtensionCommon;
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_rooms_data`");
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_assets`");
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_locations`");
    
    // Cleanup files
    $mainSectionsDir = __DIR__ . '/../../plugins/main_sections/ms_floorplan';
    if (file_exists($mainSectionsDir . '/ms_floorplan.php')) {
        unlink($mainSectionsDir . '/ms_floorplan.php');
    }
    if (is_dir($mainSectionsDir)) {
        rmdir($mainSectionsDir);
    }
    return true;
}

function extension_upgrade_floorplan() {
    return true;
}
?>
