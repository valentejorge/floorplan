<?php
$NAME = 'floorplan';
$VERSION = '1.0';

function plugin_floorplan_install() {
    require_once(__DIR__ . '/install.php');
    return true;
}

function plugin_floorplan_uninstall() {
    require_once(__DIR__ . '/uninstall.php');
    return true;
}

function plugin_floorplan_menu() {
    global $plugins_menu, $pages_refs;
    
    // Register the custom page URL routing
    $pages_refs['floorplan'] = 'extensions/floorplan/floorplan.php';
    
    // Auto-grant access to the active user profile
    if (isset($_SESSION['OCS']['profile'])) {
        $_SESSION['OCS']['profile']->addPage('floorplan');
    }

    // Add to Plugins Menu (for OCS 2.x+)
    if (!isset($plugins_menu['Floorplan'])) {
        $plugins_menu['Floorplan'] = array(
            'NAME' => 'Floorplan CAD',
            'LINK' => 'floorplan',
            'ICON' => 'fas fa-map'
        );
    }
}

$hook_menu['plugin_floorplan_menu'] = true;
?>
