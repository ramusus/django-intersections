from datetime import timedelta

from django.views.generic import View
from django.views.generic.base import TemplateResponseMixin
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from annoying.decorators import ajax_request
from vkontakte_api.api import ApiCallError
from vkontakte_groups.models import Group

from . forms import GroupsForm


GROUP_REFETCH_TIME = timedelta(hours=3)




class SubscribersIntersection(View, TemplateResponseMixin):

    template_name = 'intersections/subscribers_intersection.html'

    def get(self, request):
        return self.render_to_response({'form': GroupsForm})


@csrf_exempt
@ajax_request
def group_subscribers_update(request):
    link = request.POST['link']
    screen_name = link.split('/').pop()

    # get and update group if needed
    group = Group.objects.filter(screen_name=screen_name).first()
    # need to refetch to update members_count parameter
    if not group or group.fetched < timezone.now() - GROUP_REFETCH_TIME:
        try:
            group = Group.remote.fetch(ids=[screen_name])[0]
        except ApiCallError:
            return {'succers': False, 'errors': 'Group "%s" not found' % link}

    # print group.members_count
    # print group.members.count()

    if group.members_count > group.members.count():
        users = group.fetch_members()
        # print len(users)


    return {'succers': True}