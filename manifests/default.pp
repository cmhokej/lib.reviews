# Puppet manifest for setting up lib.reviews on Debian Jessie

# Set $PATH for all Exec resources
Exec {
  path => '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
}

# Make sure apt can fetch RethinkDB and Node.js packages via https
package { 'apt-transport-https':
  ensure => present,
  before => Exec['apt-get update'],
}

exec { 'apt-get update':
  refreshonly => true,
}

# Increase inotify.max_user_watches. Otherwise pm2 (which watches
# the filesystem for changes) can crash on an unhandled ENOSPC.
file { '/etc/sysctl.d/10-fswatch.conf':
  content => "fs.inotify.max_user_watches = 524288\n",
  notify  => Exec['update_max_user_watches'],
}

exec { 'update_max_user_watches':
  command => 'sysctl --load=/etc/sysctl.d/*.conf',
  unless  => 'sysctl fs.inotify.max_user_watches | grep -q 524288'
}


#
# RethinkDB
#

exec { 'add_rethinkdb_apt_key':
  command => 'wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | apt-key add -',
  unless  => 'apt-key list | grep -q RethinkDB',
  path    => [ '/bin', '/usr/bin' ],
}

file { '/etc/apt/sources.list.d/rethinkdb.list':
  ensure  => present,
  content => "deb https://download.rethinkdb.com/apt ${lsbdistcodename} main\n",
  require => Exec['add_rethinkdb_apt_key'],
  notify  => Exec['apt-get update'],
}

package { 'rethinkdb':
  ensure  => present,
  require => Exec['apt-get update'],
}

file { '/etc/rethinkdb/instances.d/default.conf':
  source  => 'file:///etc/rethinkdb/default.conf.sample',
  require => Package['rethinkdb'],
}

service { 'rethinkdb':
  ensure   => running,
  enable   => true,
  provider => 'systemd',
  require  => File['/etc/rethinkdb/instances.d/default.conf'],
}


#
# Node.js
#

exec { 'add_nodesource_apt_key':
  command => 'wget -qO- https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -',
  unless  => 'apt-key list | grep -q NodeSource',
}

file { '/etc/apt/sources.list.d/nodesource.list':
  content => "deb https://deb.nodesource.com/node_6.x ${lsbdistcodename} main\n",
  require => Exec['add_nodesource_apt_key'],
  notify  => Exec['apt-get update'],
}

package { [ 'build-essential', 'nodejs' ]:
  ensure  => present,
  require => Exec['apt-get update'],
}


#
# Application setup
#

exec { 'npm install':
  cwd     => '/vagrant',
  # XXX: checking for the presence of node_modules is not enough.
  # We need to allow for aborted / incomplete npm install attempts, etc.
  creates => '/vagrant/node_modules',
  require => Package['build-essential', 'nodejs'],
}

exec { 'grunt':
  cwd     => '/vagrant',
  command => '/vagrant/node_modules/grunt/bin/grunt',
  creates => '/vagrant/static/js',
  require => Exec['npm install'],
}

