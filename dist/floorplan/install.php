<?php
function extension_install_floorplan() {
    $commonObject = new ExtensionCommon;

    // 1. Create DB Tables
    $query = "
    CREATE TABLE IF NOT EXISTS `plugin_floorplan_buildings` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `name` varchar(255) NOT NULL,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ";
    $commonObject->sqlQuery($query);

    $query = "
    CREATE TABLE IF NOT EXISTS `plugin_floorplan_rooms` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `building_id` int(11) NOT NULL,
      `name` varchar(255) NOT NULL,
      `width` float NOT NULL DEFAULT '10',
      `height` float NOT NULL DEFAULT '10',
      `wall_color` varchar(50) DEFAULT '#333333',
      `floor_color` varchar(50) DEFAULT '#f0f0f0',
      `grid_size` float NOT NULL DEFAULT '0.5',
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ";
    $commonObject->sqlQuery($query);

    $query = "
    CREATE TABLE IF NOT EXISTS `plugin_floorplan_objects` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `room_id` int(11) NOT NULL,
      `type` varchar(50) NOT NULL,
      `x` float NOT NULL,
      `y` float NOT NULL,
      `width` float NOT NULL,
      `height` float NOT NULL,
      `rotation` float DEFAULT '0',
      `color` varchar(50) DEFAULT NULL,
      `label` varchar(255) DEFAULT NULL,
      `device_id` int(11) DEFAULT NULL,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ";
    $commonObject->sqlQuery($query);

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
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_objects`");
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_rooms`");
    $commonObject->sqlQuery("DROP TABLE IF EXISTS `plugin_floorplan_buildings`");
    
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
