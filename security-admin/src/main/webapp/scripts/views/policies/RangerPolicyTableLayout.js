/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

 
define(function(require){
    'use strict';

    var App				= require('App');
	var Backbone		= require('backbone');
	var XAEnums 		= require('utils/XAEnums');
	var XALinks 		= require('modules/XALinks');
	var XAGlobals 		= require('utils/XAGlobals');
	var SessionMgr 		= require('mgrs/SessionMgr');
	var XAUtil			= require('utils/XAUtils');
	
	var XABackgrid		= require('views/common/XABackgrid');
	var XATableLayout	= require('views/common/XATableLayout');
	var localization	= require('utils/XALangSupport');
	var RangerService		= require('models/RangerService');
	var RangerServiceDef	= require('models/RangerServiceDef');
	var RangerPolicy 		= require('models/RangerPolicy');
	var RangerPolicyTableLayoutTmpl = require('hbs!tmpl/policies/RangerPolicyTableLayout_tmpl');
        var RangerPolicyRO				= require('views/policies/RangerPolicyRO');

	require('backgrid-filter');
	require('backgrid-paginator');
	require('bootbox');

	var RangerPolicyTableLayout = Backbone.Marionette.Layout.extend(
	/** @lends RangerPolicyTableLayout */
	{
		_viewName : 'RangerPolicyTableLayout',
		
    	template: RangerPolicyTableLayoutTmpl,

		templateHelpers : function(){
			return {
				rangerService : this.rangerService,
				rangerServiceDef : this.rangerServiceDefModel,
				rangerPolicyType : this.collection.queryParams['policyType'],
				isRenderAccessTab : XAUtil.isRenderMasking(this.rangerServiceDefModel.get('dataMaskDef')) ? true 
                                        : XAUtil.isRenderRowFilter(this.rangerServiceDefModel.get('rowFilterDef')) ? true : false,
                isAddNewPolicyButtonShow : !(XAUtil.isAuditorOrKMSAuditor(SessionMgr)) && this.rangerService.get('isEnabled')
			};
		},
        
        breadCrumbs : function(){
            if(this.rangerService.get('type') == XAEnums.ServiceType.SERVICE_TAG.label){
                if(App.vZone && App.vZone.vZoneName){
                    return [XALinks.get('TagBasedServiceManager', App.vZone.vZoneName),XALinks.get('ManagePolicies',{model : this.rangerService})];
                }else{
                    return [XALinks.get('TagBasedServiceManager'),XALinks.get('ManagePolicies',{model : this.rangerService})];
                }
            }else{
                if(App.vZone && App.vZone.vZoneName){
                    return [XALinks.get('ServiceManager', App.vZone.vZoneName),
                        XALinks.get('ManagePolicies',{model : this.rangerService})];
                }else{
                    return [XALinks.get('ServiceManager'),XALinks.get('ManagePolicies',{model : this.rangerService})];
                }
            }
        },

		/** Layout sub regions */
    	regions: {
			'rTableList'	: 'div[data-id="r_table"]',
		},

    	// /** ui selector cache */
    	ui: {
			'btnDeletePolicy' : '[data-name="deletePolicy"]',
			'btnShowMore' : '[data-id="showMore"]',
			'btnShowLess' : '[data-id="showLess"]',
			'visualSearch' : '.visual_search',
			'policyTypeTab' : 'div[data-id="policyTypeTab"]',
                        'addNewPolicy' : '[data-js="addNewPolicy"]',
                        'iconSearchInfo' : '[data-id="searchInfo"]',
			'btnViewPolicy' : '[data-name ="viewPolicy"]',
		},

		/** ui events hash */
		events: function() {
			var events = {};
			events['click ' + this.ui.btnDeletePolicy]  = 'onDelete';
			events['click ' + this.ui.btnShowMore]  = 'onShowMore';
			events['click ' + this.ui.btnShowLess]  = 'onShowLess';
			events['click ' + this.ui.policyTypeTab + ' ul li a']  = 'onTabChange';
			events['click ' + this.ui.btnViewPolicy]  = 'onView';
			return events;
		},

    	/**
		* intialize a new RangerPolicyTableLayout Layout 
		* @constructs
		*/
		initialize: function(options) {
			console.log("initialized a RangerPolicyTableLayout Layout");
			_.extend(this, _.pick(options,'rangerService'));
			this.bindEvents();
			this.initializeServiceDef();
		},

		/** all events binding here */
		bindEvents : function(){
			//this.listenTo(this.collection, "sync", this.render, this);
		},
		initializeServiceDef : function(){
			this.rangerServiceDefModel	= new RangerServiceDef();
			this.rangerServiceDefModel.url = "service/plugins/definitions/name/"+this.rangerService.get('type');
			this.rangerServiceDefModel.fetch({
				cache : false,
				async : false
            });
		},
		
		initializePolicies : function(policyType){
			this.collection.url = XAUtil.getServicePoliciesURL(this.rangerService.id);
			if(!_.isUndefined(policyType)){
				this.collection.queryParams['policyType'] = policyType;
			}
            if(!_.isUndefined(App.vZone) && App.vZone.vZoneName){
                this.collection.queryParams['zoneName'] = App.vZone.vZoneName;
            }
			this.collection.fetch({
				cache : false,
			});
		},
		/** on render callback */
		onRender: function() {
			this.setTabForPolicyListing();
			this.addVisualSearch();
			this.renderTable();
			this.initializePolicies();
            XAUtil.searchInfoPopover(this.searchInfoArray , this.ui.iconSearchInfo , 'bottom');

		},
		/** all post render plugin initialization */
		initializePlugins: function(){
		},
		setTabForPolicyListing : function(){
			var policyType = this.collection.queryParams['policyType']
			if( XAUtil.isMaskingPolicy(policyType) ){
				this.ui.policyTypeTab.find('ul li').removeClass('active');
				this.$el.find('li[data-tab="masking"]').addClass('active');
			}else if( XAUtil.isRowFilterPolicy(policyType) ){
				this.ui.policyTypeTab.find('ul li').removeClass('active');
				this.$el.find('li[data-tab="rowLevelFilter"]').addClass('active');
			}
			this.showRequiredTabs()
		},
		showRequiredTabs : function(){
			if(XAUtil.isRenderMasking(this.rangerServiceDefModel.get('dataMaskDef'))){
				this.$el.find('li[data-tab="masking"]').show();
			}
			if(XAUtil.isEmptyObjectResourceVal(this.rangerServiceDefModel.get('rowFilterDef'))){
				this.$el.find('li[data-tab="rowLevelFilter"]').hide();
			}
		},
		renderTable : function(){
			var that = this;
			this.rTableList.show(new XATableLayout({
				columns: this.getColumns(),
				collection: this.collection,
				includeFilter : false,
				gridOpts : {
					row: Backgrid.Row.extend({}),
					header : XABackgrid,
					emptyText : '暂无数据' + (this.rangerService.get('isEnabled') ? '' : ' The service is disabled!')
				},
			}));
		},

		onView : function(e){
			var that = this;
			var policyId = $(e.currentTarget).data('id');
			var rangerPolicy = new RangerPolicy({ id : policyId});
			rangerPolicy.fetch({
				cache : false,
			}).done(function(){
				var policyVersionList = rangerPolicy.fetchVersions();
				var view = new RangerPolicyRO({
					model : rangerPolicy,
					policyVersionList : policyVersionList,
					rangerService: that.rangerServiceDefModel
				});
				var modal = new Backbone.BootstrapModal({
					animate : true,
					content	: view,
					title	: localization.tt("h.policyDetails"),
					okText 	: localization.tt("lbl.ok"),
					allowCancel : true,
					escape 	: true
				}).open();
				var policyVerEl = modal.$el.find('.modal-footer').prepend('<div class="policyVer pull-left"></div>').find('.policyVer');
				policyVerEl.append('<i id="preVer" class="icon-chevron-left ' + ((rangerPolicy.get('version') > 1) ? 'active' : '') + '"></i><text>Version ' + rangerPolicy.get('version') + '</text>').find('#preVer').click(function(e) {
					view.previousVer(e);
				});
				var policyVerIndexAt = policyVersionList.indexOf(rangerPolicy.get('version').toString());
				policyVerEl.append('<i id="nextVer" class="icon-chevron-right ' + (!_.isUndefined(policyVersionList[++policyVerIndexAt]) ? 'active' : '') + '"></i>').find('#nextVer').click(function(e) {
					view.nextVer(e);
				});
				policyVerEl.after('<a id="revert" href="#" class="btn btn-primary" style="display:none;">Revert</a>').next('#revert').click(function(e){
					view.revert(e, that.collection, modal);
				});
				modal.$el.find('.cancel').hide();
			});
		},

		getColumns : function(){
			var that = this;
			var cols = {
				id : {
                    cell : 'html',
					label	: localization.tt("lbl.policyId"),
                    formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
                        fromRaw: function (rawValue, model) {
                            if(XAUtil.isAuditorOrKMSAuditor(SessionMgr)){
                                if(!_.isEmpty(model.get('validitySchedules')) && XAUtil.isPolicyExpierd(model)){
                                    return '<div class="expiredIconPosition">\
                                                <i class="icon-exclamation-sign backgrigModelId" title="Policy expired"></i>\
                                                '+model.id+'\
                                             </div>';
                                }else{
                                    return '<div class="expiredIconPosition">\
                                                '+model.id+'\
                                            </div>';
                                }
                            }else{
                                if(!_.isEmpty(model.get('validitySchedules')) && XAUtil.isPolicyExpierd(model)){
                                    return '<div class="expiredIconPosition">\
                                                <i class="icon-exclamation-sign backgrigModelId" title="Policy expired"></i>\
                                                <a class="" href="#!/service/'+that.rangerService.id+'/policies/'+model.id+'/edit">'+model.id+'</a>\
                                             </div>';
                                }else{
                                    return '<div class="expiredIconPosition">\
                                                <a class="" href="#!/service/'+that.rangerService.id+'/policies/'+model.id+'/edit">'+model.id+'</a>\
                                            </div>';
                                }
                            }
                        }
                    }),
					editable: false,
					sortable : false
				},
				name : {
					cell : 'string',
					label	: localization.tt("lbl.policyName"),
					editable: false,
					sortable : false
                },
                policyLabels: {
                    cell	: Backgrid.HtmlCell.extend({className: 'cellWidth-1'}),
                    label : localization.tt("lbl.policyLabels"),
                    formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
                        fromRaw: function (rawValue, model) {
                            if(!_.isUndefined(rawValue) && rawValue.length != 0){
                                return XAUtil.showMoreAndLessButton(rawValue, model)
                            }else{
                                return '--';
                            }
                        }
                    }),
                    editable : false,
                    sortable : false
                },
				isEnabled:{
					label:localization.tt('lbl.status'),
					cell :"html",
					editable:false,
					formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
						fromRaw: function (rawValue) {
							return rawValue ? '<label class="label label-success">Enabled</label>' : '<label class="label label-important">Disabled</label>';
						}
					}),
					click : false,
					drag : false,
					sortable : false
				},
				isAuditEnabled:{
					label:localization.tt('lbl.auditLogging'),
					cell :"html",
					editable:false,
					formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
						fromRaw: function (rawValue) {
							return rawValue ? '<label class="label label-success">Enabled</label>' : '<label class="label label-important">Disabled</label>';
						}
					}),
					click : false,
					drag : false,
					sortable : false
				},
                                roles : {
                                        reName : 'roleName',
                                        cell	: Backgrid.HtmlCell.extend({className: 'cellWidth-1'}),
                                        label : localization.tt("lbl.roles"),
                                        formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
                                                fromRaw: function (rawValue, model) {
                                                        return XAUtil.showGroupsOrUsersForPolicy(model.get('policyItems'), model, 'roles', that.rangerServiceDefModel);
                                                }
                                        }),
                                        editable : false,
                                        sortable : false
                                },
				policyItems : {
					reName : 'groupName',
					cell	: Backgrid.HtmlCell.extend({className: 'cellWidth-1'}),
					label : localization.tt("lbl.group"),
					formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
						fromRaw: function (rawValue, model) {
							if(!_.isUndefined(rawValue)){
                                                                return XAUtil.showGroupsOrUsersForPolicy(rawValue, model, 'groups', that.rangerServiceDefModel);
							}
							return '--';
						}
					}),
					editable : false,
					sortable : false
				},
				//Hack for backgrid plugin doesn't allow to have same column name 
				users : {
					reName : 'userName',
					cell	: Backgrid.HtmlCell.extend({className: 'cellWidth-1'}),
					label : localization.tt("lbl.users"),
					formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
						fromRaw: function (rawValue, model) {
                                                                return XAUtil.showGroupsOrUsersForPolicy(model.get('policyItems'), model, 'users', that.rangerServiceDefModel);
                                                }
                                        }),
                                        editable : false,
                                        sortable : false
                                },
			};
			cols['permissions'] = {
				cell :  "html",
				label : localization.tt("lbl.action"),
				formatter: _.extend({}, Backgrid.CellFormatter.prototype, {
					fromRaw: function (rawValue,model) {
                        if(XAUtil.isAuditorOrKMSAuditor(SessionMgr)){
                            return '<a href="javascript:void(0);" data-name ="viewPolicy" data-id="'+model.id+'" class="btn btn-mini" title="View"><i class="icon-eye-open icon-large" /></a>';
                        }else{
                            return '<a href="javascript:void(0);" data-name ="viewPolicy" data-id="'+model.id+'" class="btn btn-mini" title="View"><i class="icon-eye-open icon-large" /></a>\
                                    <a href="#!/service/'+that.rangerService.id+'/policies/'+model.id+'/edit" class="btn btn-mini" title="Edit"><i class="icon-edit icon-large" /></a>\
                                    <a href="javascript:void(0);" data-name ="deletePolicy" data-id="'+model.id+'"  class="btn btn-mini btn-danger" title="Delete"><i class="icon-trash icon-large" /></a>';
						//You can use rawValue to custom your html, you can change this value using the name parameter.
                        }
					}
				}),
				editable: false,
				sortable : false

			};
			return this.collection.constructor.getTableCols(cols, this.collection);
		},
		onDelete :function(e){
			var that = this;
			
			var obj = this.collection.get($(e.currentTarget).data('id'));
			var model = new RangerPolicy(obj.attributes);
			model.collection = this.collection;
			XAUtil.confirmPopup({
				//msg :localize.tt('msg.confirmDelete'),
				msg :'Are you sure want to delete ?',
				callback : function(){
					XAUtil.blockUI();
					model.destroy({
						success: function(model, response) {
							XAUtil.blockUI('unblock');
							that.collection.remove(model.get('id'));
							XAUtil.notifySuccess('Success', localization.tt('msg.policyDeleteMsg'));
							that.renderTable();
							that.collection.fetch();
						},
						error: function (model, response, options) {
							XAUtil.blockUI('unblock');
							if ( response && response.responseJSON && response.responseJSON.msgDesc){
								    XAUtil.notifyError('Error', response.responseJSON.msgDesc);
							    }else
							    	XAUtil.notifyError('Error', 'Error deleting Policy!');
							    console.log("error");
						}
					});
				}
			});
		},
		onShowMore : function(e){
                    var attrName = this.attributName(e);
                    var id = $(e.currentTarget).attr(attrName[0]);
			var $td = $(e.currentTarget).parents('td');
			$td.find('['+attrName+'="'+id+'"]').show();
			$td.find('[data-id="showLess"]['+attrName+'="'+id+'"]').show();
			$td.find('[data-id="showMore"]['+attrName+'="'+id+'"]').hide();
			$td.find('[data-id="showMore"]['+attrName+'="'+id+'"]').parents('div[data-id="groupsDiv"]').addClass('set-height-groups');
		},
		onShowLess : function(e){
                    var attrName = this.attributName(e)
			var $td = $(e.currentTarget).parents('td');
                    var id = $(e.currentTarget).attr(attrName[0]);
			$td.find('['+attrName+'="'+id+'"]').slice(4).hide();
			$td.find('[data-id="showLess"]['+attrName+'="'+id+'"]').hide();
			$td.find('[data-id="showMore"]['+attrName+'="'+id+'"]').show();
			$td.find('[data-id="showMore"]['+attrName+'="'+id+'"]').parents('div[data-id="groupsDiv"]').removeClass('set-height-groups');
		},
                attributName :function(e){
                    var attrName = ['policy-groups-id', 'policy-users-id', 'policy-label-id' , 'policy-roles-id'], attributeName = "";
                    attributeName =_.filter(attrName, function(name){
                        if($(e.currentTarget).attr(name)){
                            return name;
                        }
                    });
                    return attributeName;
                },

		addVisualSearch : function(){

                        var that = this, resources = this.rangerServiceDefModel.get('resources');
                        var policyType = this.collection.queryParams['policyType'];
                        if(XAUtil.isMaskingPolicy(policyType) ){
                        	if(!_.isEmpty(this.rangerServiceDefModel.get('dataMaskDef').resources)){
                        		resources = this.rangerServiceDefModel.get('dataMaskDef')['resources'];
                        	}else{
                        		resources = this.rangerServiceDefModel.get('resources');
                        	}    
                        }else if(XAUtil.isRowFilterPolicy(policyType) ){
                                resources = this.rangerServiceDefModel.get('rowFilterDef')['resources'];
                        }
                        var resourceSearchOpt = _.map(resources, function(resource){
                                        return { 'name' : resource.name, 'label' : resource.label };
                        });
			var PolicyStatusValue = _.map(XAEnums.ActiveStatus, function(status) { return { 'label': status.label, 'value': Boolean(status.value)}; });
	
                        var searchOpt = ['Policy Name','组名','用户名','Status', 'Policy Label'];//,'Start Date','End Date','Today'];
                        searchOpt = _.union(searchOpt, _.map(resourceSearchOpt, function(opt){ return opt.label }))
                        var serverAttrName  = [{text : "组名",  label :"group",   info:localization.tt('h.groupNameMsg')},
                                               {text : "Policy Name", label :"policyNamePartial",  info :localization.tt('msg.policyNameMsg')},
                                               {text : "Status",      info : localization.tt('msg.statusMsg') ,  label :"isEnabled",'multiple' : true, 'optionsArr' : PolicyStatusValue},
                                               {text : "用户名",   label :"user" ,  info :localization.tt('h.userMsg')},
                                               {text : "Policy Label",   label :"policyLabelsPartial" ,  info :localization.tt('h.policyLabelsinfo')},
                                               ];
			                     // {text : 'Start Date',label :'startDate'},{text : 'End Date',label :'endDate'},
				                 //  {text : 'Today',label :'today'}];
                        var info = { collection : localization.tt('h.collection')    , column   :localization.tt('lbl.columnName'),
                                         'column-family':localization.tt('msg.columnfamily') , database :localization.tt('h.database'),
                                          entity        :localization.tt('h.entity') , keyname  :localization.tt('lbl.keyName'),
                                          path:localization.tt('h.path'), queue: localization.tt('h.queue'), service:localization.tt('h.serviceNameMsg'),
                                          table:localization.tt('lbl.tableName'), tag : localization.tt('h.tagsMsg'),
                                          topic:localization.tt('h.topic')    ,topology:localization.tt('lbl.topologyName'),
                                          type:localization.tt('h.type')    ,udf:localization.tt('h.udf') , url:localization.tt('h.url'),
                                          'type-category': localization.tt('h.typeCategory'), 'entity-type': localization.tt('h.entityType'),
                                          'entity-classification': localization.tt('h.entityClassification'), 'atlas-service': localization.tt('h.atlasService'),
                                          connector: localization.tt('h.connector'), link: localization.tt('h.link'), job: localization.tt('h.job'),
                                          project: localization.tt('h.project'), 'nifi-resource': localization.tt('h.nifiResource')
                                                 };
			var serverRsrcAttrName = _.map(resourceSearchOpt,function(opt){ 
                                        return {
                                                'text': opt.label,
                                                'label': 'resource:'+ opt.name,
                                                'info' : info[opt.name],
                                        };
			});
			serverAttrName = _.union(serverAttrName, serverRsrcAttrName)
                    this.searchInfoArray = serverAttrName;
			var pluginAttr = {
				      placeholder :localization.tt('h.searchForPolicy'),
				      container : this.ui.visualSearch,
				      query     : '',
				      callbacks :  { 
				    	  valueMatches :function(facet, searchTerm, callback) {
								switch (facet) {
									case 'Status':
										callback(that.getActiveStatusNVList());
										break;
									case 'Policy Type':
										callback(that.getNameOfPolicyTypeNVList());
//										callback(XAUtil.enumToSelectLabelValuePairs(XAEnums.PolicyType));
										break;		
								/*	case 'Audit Status':
										callback(XAUtil.enumToSelectLabelValuePairs(XAEnums.AuthType));
										break;	
									case 'Start Date' :
										setTimeout(function () { XAUtil.displayDatepicker(that.ui.visualSearch, callback); }, 0);
										break;
									case 'End Date' :
										setTimeout(function () { XAUtil.displayDatepicker(that.ui.visualSearch, callback); }, 0);
										break;
									case 'Today'	:
										var today = Globalize.format(new Date(),"yyyy/mm/dd");
										callback([today]);
										break;*/
								}     
			            	
							}
				      }
				};
			window.vs = XAUtil.addVisualSearch(searchOpt,serverAttrName, this.collection,pluginAttr);
		},

		getActiveStatusNVList : function() {
			var activeStatusList = _.filter(XAEnums.ActiveStatus, function(obj){
				if(obj.label != XAEnums.ActiveStatus.STATUS_DELETED.label)
					return obj;
			});
			return _.map(activeStatusList, function(status) { return { 'label': status.label, 'value': status.label}; })
		},
		getNameOfPolicyTypeNVList : function() {
			return _.map(XAEnums.PolicyType, function(type) { return { 'label': type.label, 'value': type.label};});
		},
		onTabChange : function(e){
			var that = this, 
			tab = $(e.currentTarget).attr('href');
			var href = this.ui.addNewPolicy.attr('href')
			switch (tab) {
				case "#access":
					var val = XAEnums.RangerPolicyType.RANGER_ACCESS_POLICY_TYPE.value;
					App.appRouter.navigate("#!/service/"+this.rangerService.id+"/policies/"+ val,{trigger: true});
					break;
				case "#masking":
					var val = XAEnums.RangerPolicyType.RANGER_MASKING_POLICY_TYPE.value;
					App.appRouter.navigate("#!/service/"+this.rangerService.id+"/policies/"+ val,{trigger: true});
					break;
				case "#rowLevelFilter":
					var val = XAEnums.RangerPolicyType.RANGER_ROW_FILTER_POLICY_TYPE.value;
					App.appRouter.navigate("#!/service/"+this.rangerService.id+"/policies/"+ val,{trigger: true});
					break;
			}
		},
		/** on close */
		onClose: function(){
            XAUtil.removeUnwantedDomElement();
		}

	});

	return RangerPolicyTableLayout; 
});
