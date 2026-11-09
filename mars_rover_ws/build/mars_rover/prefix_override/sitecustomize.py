import sys
if sys.prefix == '/usr':
    sys.real_prefix = sys.prefix
    sys.prefix = sys.exec_prefix = '/home/kamlesh/rover_final/mars_rover_ws/install/mars_rover'
